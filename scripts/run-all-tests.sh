#!/bin/bash

# Script to run tests for all services in the Gainz application
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
echo "🧪 Running tests for all Gainz services 🧪"
echo "=========================================="

# Define color codes for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to the root directory
cd "$ROOT_DIR"

# Service configuration
declare -A SERVICE_TYPES=(
  ["authentication"]="nodejs"
  ["authorization"]="nodejs"
  ["user"]="nodejs"
  ["gateway"]="go"
)

# Get all service directories
echo "Looking for services in $ROOT_DIR/services"
ALL_SERVICES=$(find "$ROOT_DIR/services" -maxdepth 1 -type d | grep -v "^$ROOT_DIR/services$")

# Filter out the gateway service
SERVICES=""
for SERVICE_DIR in $ALL_SERVICES; do
  SERVICE_NAME=$(basename "$SERVICE_DIR")
  if [ "$SERVICE_NAME" != "gateway" ]; then
    SERVICES="$SERVICES $SERVICE_DIR"
  fi
done

# Debug: print found services
echo "Found services:"
for SERVICE_DIR in $SERVICES; do
  echo "  - $(basename "$SERVICE_DIR")"
done

# Initialize counters
TOTAL_SERVICES=0
PASSED_SERVICES=0
FAILED_SERVICES=0
SKIPPED_SERVICES=0

# Function to check if a service has a test script in package.json
check_test_script() {
  local service_name=$1
  docker compose exec "$service_name" bash -c "test -f package.json && grep -q '\"test\":' package.json" 2>/dev/null
  return $?
}

# Loop through each service and run tests
for SERVICE_DIR in $SERVICES; do
  SERVICE_NAME=$(basename "$SERVICE_DIR")
  ((TOTAL_SERVICES++))
  
  # Get service type
  SERVICE_TYPE=${SERVICE_TYPES[$SERVICE_NAME]:-"unknown"}
  
  echo -e "\n${YELLOW}Running tests for ${SERVICE_NAME} service...${NC}"
  
  # Check if the service is in Docker Compose
  echo "Checking if $SERVICE_NAME is running in Docker..."
  if docker compose ps | grep -q "$SERVICE_NAME"; then
    echo "Service $SERVICE_NAME is running in Docker"
    
    # Check if the service has a test script defined
    if check_test_script "$SERVICE_NAME"; then
      # Run tests within Docker container
      echo "Running 'npm test' in $SERVICE_NAME container..."
      if docker compose exec "$SERVICE_NAME" npm test; then
        echo -e "${GREEN}✅ Tests for $SERVICE_NAME passed!${NC}"
        ((PASSED_SERVICES++))
      else
        echo -e "${RED}❌ Tests for $SERVICE_NAME failed!${NC}"
        ((FAILED_SERVICES++))
      fi
    else
      echo -e "${YELLOW}⚠️ No test script found in package.json for $SERVICE_NAME${NC}"
      echo "You can add a test script to package.json with:"
      echo "  \"scripts\": { \"test\": \"jest\" }"
      ((SKIPPED_SERVICES++))
    fi
  else
    echo "Service $SERVICE_NAME is not running in Docker, skipping tests"
    ((SKIPPED_SERVICES++))
  fi
done

# Print summary
echo -e "\n=========================================="
echo -e "📊 ${YELLOW}Test Results Summary${NC} 📊"
echo -e "=========================================="
echo -e "Total services: ${TOTAL_SERVICES}"
echo -e "Passed: ${GREEN}${PASSED_SERVICES}${NC}"
echo -e "Failed: ${RED}${FAILED_SERVICES}${NC}"
echo -e "Skipped: ${BLUE}${SKIPPED_SERVICES}${NC}"
echo -e "=========================================="

# Exit with non-zero status if any service tests failed
if [ $FAILED_SERVICES -gt 0 ]; then
  exit 1
fi

exit 0
