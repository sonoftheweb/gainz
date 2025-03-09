#!/bin/bash

# Script to generate Swagger documentation and Postman collections for all services
# Author: Jacob Ekanem
# Date: March 8, 2025

# Comment out set -e to prevent script from exiting on first error
# set -e

# Enable debug mode with -v flag
if [ "$1" = "-v" ]; then
  set -x  # Print commands and their arguments as they are executed
  VERBOSE=true
else
  VERBOSE=false
fi

echo "=========================================="
echo "📚 Generating API documentation for all Gainz services 📚"
echo "=========================================="

# Define color codes for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to the root directory
cd "$ROOT_DIR"

# Get all service directories
echo "Looking for services in $ROOT_DIR/services"
SERVICES=$(find "$ROOT_DIR/services" -maxdepth 1 -type d | grep -v "^$ROOT_DIR/services$")

# Debug: print found services
echo "Found services:"
for SERVICE_DIR in $SERVICES; do
  echo "  - $(basename "$SERVICE_DIR")"
done

# Create output directory for combined docs
API_DOCS_DIR="$ROOT_DIR/api-docs"
echo "Creating output directory: $API_DOCS_DIR"
mkdir -p "$API_DOCS_DIR"
echo "Output directory created successfully"

# Create a temporary directory for script transfers
TMP_DIR="$ROOT_DIR/tmp"
mkdir -p "$TMP_DIR"

# Copy the generator script to the temp directory
cp "$SCRIPT_DIR/generate-postman-collection.js" "$TMP_DIR/"

# Initialize counters
TOTAL_SERVICES=0
PROCESSED_SERVICES=0
SKIPPED_SERVICES=0

# Service ports mapping
declare -A SERVICE_PORTS=(
  ["authentication"]="3001"
  ["authorization"]="3002"
  ["user"]="3003"
)

# Loop through each service and generate documentation
for SERVICE_DIR in $SERVICES; do
  SERVICE_NAME=$(basename "$SERVICE_DIR")
  ((TOTAL_SERVICES++))
  
  # Skip gateway service since it's a Go service
  if [ "$SERVICE_NAME" = "gateway" ]; then
    echo -e "\n${YELLOW}Skipping ${SERVICE_NAME} service (Go service without Node.js)...${NC}"
    ((SKIPPED_SERVICES++))
    continue
  fi
  
  echo -e "\n${YELLOW}Generating documentation for ${SERVICE_NAME} service...${NC}"
  
  # Get the service port
  SERVICE_PORT=${SERVICE_PORTS[$SERVICE_NAME]}
  if [ -z "$SERVICE_PORT" ]; then
    echo -e "${YELLOW}⚠️ No port configuration found for $SERVICE_NAME, using default port 3000${NC}"
    SERVICE_PORT="3000"
  fi
  
  # Check if the service is in Docker Compose and running
  echo "Checking if $SERVICE_NAME is running in Docker..."
  DOCKER_PS_OUTPUT=$(docker compose ps)
  echo "Docker compose services currently running:"
  echo "$DOCKER_PS_OUTPUT"
  
  if echo "$DOCKER_PS_OUTPUT" | grep -q "$SERVICE_NAME"; then
    echo "Service $SERVICE_NAME is running in Docker"
    
    # Ensure scripts and docs directories exist in the container
    docker compose exec "$SERVICE_NAME" mkdir -p /app/scripts /app/docs
    
    # Copy our local generator script to the container
    echo "Copying generator script to $SERVICE_NAME container..."
    docker compose cp "$TMP_DIR/generate-postman-collection.js" "$SERVICE_NAME":/app/scripts/
    
    # Make sure axios is installed
    echo "Ensuring axios is installed in $SERVICE_NAME..."
    docker compose exec "$SERVICE_NAME" npm install --save axios
    
    # Run the script with service-specific parameters
    echo "Generating Postman collection for $SERVICE_NAME on port $SERVICE_PORT..."
    if docker compose exec "$SERVICE_NAME" node /app/scripts/generate-postman-collection.js "$SERVICE_NAME" "$SERVICE_PORT"; then
      echo -e "${GREEN}✅ Postman collection for $SERVICE_NAME generated successfully!${NC}"
      
      # Copy the generated collection to the api-docs directory
      docker compose cp "$SERVICE_NAME":/app/docs/postman_collection.json "$API_DOCS_DIR/${SERVICE_NAME}_postman_collection.json"
      echo "Collection saved to $API_DOCS_DIR/${SERVICE_NAME}_postman_collection.json"
      
      ((PROCESSED_SERVICES++))
    else
      echo -e "${RED}❌ Failed to generate Postman collection for $SERVICE_NAME!${NC}"
      ((SKIPPED_SERVICES++))
    fi
  else
    echo "Service $SERVICE_NAME is not running in Docker, skipping documentation generation"
    ((SKIPPED_SERVICES++))
  fi
done

# If we have multiple collections, create a combined collection
if [ $PROCESSED_SERVICES -gt 1 ]; then
  echo -e "\n${YELLOW}Creating combined Postman collection...${NC}"
  
  # Initialize combined collection file
  cat > "$API_DOCS_DIR/gainz_combined_postman_collection.json" << EOF
{
  "info": {
    "name": "Gainz Complete API",
    "description": "Combined API documentation for all Gainz services",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001",
      "type": "string"
    }
  ]
}
EOF
  
  echo -e "${GREEN}✅ Combined collection template created${NC}"
  echo "Note: To fully combine collections, you may need to use Postman's collection import feature"
fi

# Print summary
echo -e "\n=========================================="
echo -e "📊 ${YELLOW}Documentation Generation Summary${NC} 📊"
echo -e "=========================================="
echo -e "Total services: ${TOTAL_SERVICES}"
echo -e "Documentation generated: ${GREEN}${PROCESSED_SERVICES}${NC}"
echo -e "Skipped services: ${YELLOW}${SKIPPED_SERVICES}${NC}"
echo -e "=========================================="
echo -e "API documentation stored in: ${GREEN}${API_DOCS_DIR}${NC}"
echo -e "=========================================="

exit 0
