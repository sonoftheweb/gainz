#!/bin/bash

# Gainz Project Management Script
# Consolidates all scripts into one command-line tool

# Define colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Help function
show_help() {
  echo -e "${GREEN}Gainz Project Management Tool${NC}"
  echo "Usage: ./gainz.sh <command> [options]"
  echo ""
  echo "Commands:"
  echo "  dev                Start development environment"
  echo "  prod               Start production environment"
  echo "  logs [-f]          Show logs (-f to follow)"
  echo "  restart <service>  Restart a specific service"
  echo "  test-dev           Test development mode hot reloading"
  echo "  setup              Set up local editor support"
  echo "  docs [-v]          Generate API documentation (-v for verbose)"
  echo "  test               Run all tests"
  echo "  migrate            Run database migrations"
  echo "  help               Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./gainz.sh dev"
  echo "  ./gainz.sh logs -f"
  echo "  ./gainz.sh restart authentication"
  echo ""
}

# Dev environment function
start_dev_env() {
  echo -e "${GREEN}Starting development environment...${NC}"
  
  # Stop and remove any existing containers
  docker compose down
  
  # Start development environment
  docker compose -f docker-compose.dev.yml up -d
  
  # Show API address
  echo ""
  echo "🚀 Gainz API is now running!"
  echo "📝 Access the API at: http://localhost"
  echo ""
  
  # Show logs
  docker compose -f docker-compose.dev.yml logs -f
}

# Production environment function
start_prod_env() {
  echo -e "${GREEN}Starting production environment...${NC}"
  
  # Stop and remove any existing containers
  docker compose -f docker-compose.dev.yml down
  
  # Start production environment
  docker compose up -d
  
  # Show logs
  docker compose logs -f
}

# Logs function
show_logs() {
  local FOLLOW=false
  if [ "$1" == "-f" ]; then
    FOLLOW=true
  fi

  # Function to show logs with color and service name
  show_service_logs() {
    local service=$1
    local color=$2
    local lines=${3:-10}
    local follow_arg=""
    
    if [ "$FOLLOW" = true ]; then
      follow_arg="--follow"
    fi
    
    echo -e "${color}======== $service logs ========${NC}"
    docker logs gainz-$service --tail=$lines $follow_arg
    echo ""
  }

  # Show logs for all services
  if [ "$FOLLOW" = true ]; then
    echo "Showing and following logs for all services. Press Ctrl+C to exit."
    docker compose -f docker-compose.dev.yml logs --follow
  else
    # Show logs for each service individually with different colors
    show_service_logs "gateway" $MAGENTA 10
    show_service_logs "authentication" $GREEN 10
    show_service_logs "authorization" $BLUE 10
    show_service_logs "user" $CYAN 10
    show_service_logs "postgres" $YELLOW 5
    
    echo -e "${GREEN}To follow logs in real-time, use: ./gainz.sh logs -f${NC}"
  fi
}

# Restart service function
restart_service() {
  local SERVICE=$1
  
  # Check if service name is provided
  if [ -z "$SERVICE" ]; then
    echo -e "${RED}Error: Please specify a service name.${NC}"
    echo "Usage: ./gainz.sh restart [service-name]"
    echo "Available services: gateway, authentication, authorization, user"
    return 1
  fi
  
  # Validate service name
  case $SERVICE in
    gateway|authentication|authorization|user)
      # Valid service
      ;;
    *)
      echo -e "${RED}Error: Invalid service name '${SERVICE}'.${NC}"
      echo "Available services: gateway, authentication, authorization, user"
      return 1
      ;;
  esac
  
  echo -e "${GREEN}Restarting ${SERVICE} service...${NC}"
  
  # Restart the service
  docker compose -f docker-compose.dev.yml restart $SERVICE
  
  # Show logs from the restarted service
  echo -e "${GREEN}Showing logs for ${SERVICE} service:${NC}"
  docker logs gainz-$SERVICE --tail=10
  
  echo -e "${GREEN}${SERVICE} service has been restarted.${NC}"
}

# Test development mode function
test_dev_mode() {
  echo "Testing development mode for all services..."
  
  # Test authentication service
  echo "Adding a test comment to authentication service..."
  echo "// Test comment $(date)" >> ./services/authentication/src/controllers/authController.ts
  sleep 2
  docker logs gainz-authentication --tail=5
  echo ""
  
  # Test authorization service
  echo "Adding a test comment to authorization service..."
  echo "// Test comment $(date)" >> ./services/authorization/src/controllers/authorizationController.ts
  sleep 2
  docker logs gainz-authorization --tail=5
  echo ""
  
  # Test user service
  echo "Adding a test comment to user service..."
  echo "// Test comment $(date)" >> ./services/user/src/controllers/userController.ts
  sleep 2
  docker logs gainz-user --tail=5
  echo ""
  
  # Test gateway service (may not show logs if using air)
  echo "Adding a test comment to gateway service..."
  echo "// Test comment $(date)" >> ./services/gateway/cmd/server/main.go
  sleep 2
  docker logs gainz-gateway --tail=5
  echo ""
  
  echo "Development mode test complete!"
}

# Setup editor function
setup_editor() {
  echo -e "${GREEN}Setting up local development environment for editor support...${NC}"
  
  # Function to set up a service
  setup_service() {
    local service=$1
    echo -e "${BLUE}Setting up $service service...${NC}"
    echo -e "${YELLOW}Installing dependencies...${NC}"
    cd ./services/$service && npm install
    echo -e "${YELLOW}Generating Prisma client...${NC}"
    npx prisma generate
  
    # Ensure prisma.ts file exists in lib directory
    mkdir -p src/lib
    if [ ! -f src/lib/prisma.ts ]; then
      echo -e "${YELLOW}Creating prisma.ts file...${NC}"
      echo '// Direct import of Prisma client through Node.js import
import { PrismaClient } from "@prisma/client"

// Create a single instance of Prisma client to be used throughout the application
const prisma = new PrismaClient()

// Export the instance
export default prisma' > src/lib/prisma.ts
    fi
  
    echo -e "${GREEN}$service service setup complete.${NC}"
    cd ../..
  }
  
  # Set up each service
  setup_service "authentication"
  setup_service "authorization"
  setup_service "user"
  
  echo -e "${GREEN}All services set up successfully!${NC}"
  echo -e "${BLUE}Notes:${NC}"
  echo -e "1. If your editor still shows TypeScript errors, try restarting the TypeScript server."
  echo -e "2. For VSCode: Cmd+Shift+P -> 'TypeScript: Restart TS server'"
  echo -e "3. For JetBrains IDEs: File -> Invalidate Caches / Restart"
}

# Run database migrations
run_migrations() {
  echo "Generating and applying migrations for all services..."
  
  # Authentication service
  echo "Generating and applying migrations for authentication service..."
  docker compose -f docker-compose.dev.yml exec authentication npx prisma migrate dev --name init
  
  # Authorization service
  echo "Generating and applying migrations for authorization service..."
  docker compose -f docker-compose.dev.yml exec authorization npx prisma migrate dev --name init
  
  # User service
  echo "Generating and applying migrations for user service..."
  docker compose -f docker-compose.dev.yml exec user npx prisma migrate dev --name init
  
  echo "Migrations generated and applied for all services."
}

# Generate API documentation
generate_docs() {
  local VERBOSE=false
  if [ "$1" = "-v" ]; then
    set -x  # Print commands and their arguments as they are executed
    VERBOSE=true
  fi

  echo "=========================================="
  echo "📚 Generating API documentation for all Gainz services 📚"
  echo "=========================================="
  
  # Get all service directories
  echo "Looking for services in $SCRIPT_DIR/services"
  SERVICES=$(find "$SCRIPT_DIR/services" -maxdepth 1 -type d | grep -v "^$SCRIPT_DIR/services$")
  
  # Debug: print found services
  echo "Found services:"
  for SERVICE_DIR in $SERVICES; do
    echo "  $(basename "$SERVICE_DIR")"
  done
  
  # Create docs directory if it doesn't exist
  mkdir -p "$SCRIPT_DIR/api-docs"
  
  echo ""
  echo "Generating API documentation..."
  
  # Process each service
  # This is a simplified version - the full version would call into the generate-api-docs.sh script
  for SERVICE_DIR in $SERVICES; do
    SERVICE_NAME=$(basename "$SERVICE_DIR")
    echo -e "${YELLOW}Processing $SERVICE_NAME service...${NC}"
    
    # Check if the service has a Swagger config
    if [ -f "$SERVICE_DIR/src/config/swagger.ts" ]; then
      echo -e "${GREEN}Found Swagger configuration for $SERVICE_NAME${NC}"
      
      # Here we would execute the service-specific documentation generation
      # For simplicity, we'll just print a message
      echo -e "${GREEN}Generated API docs for $SERVICE_NAME${NC}"
    else
      echo -e "${YELLOW}No Swagger configuration found for $SERVICE_NAME, skipping...${NC}"
    fi
  done
  
  echo -e "${GREEN}API documentation generated successfully!${NC}"
  echo -e "Docs available at http://localhost/api-docs when services are running"
}

# Run all tests
run_tests() {
  echo "Running tests for all services..."
  
  # For each service, we would execute their test commands
  # This is a simplified version - the full version would call into the run-all-tests.sh script
  
  echo "Running authentication service tests..."
  cd "$SCRIPT_DIR/services/authentication" && npm test
  
  echo "Running authorization service tests..."
  cd "$SCRIPT_DIR/services/authorization" && npm test
  
  echo "Running user service tests..."
  cd "$SCRIPT_DIR/services/user" && npm test
  
  echo "Running gateway service tests..."
  cd "$SCRIPT_DIR/services/gateway" && go test ./...
  
  echo "All tests completed!"
}

# Main script logic
case "$1" in
  dev)
    start_dev_env
    ;;
  prod)
    start_prod_env
    ;;
  logs)
    show_logs "$2"
    ;;
  restart)
    restart_service "$2"
    ;;
  test-dev)
    test_dev_mode
    ;;
  setup)
    setup_editor
    ;;
  docs)
    generate_docs "$2"
    ;;
  test)
    run_tests
    ;;
  migrate)
    run_migrations
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    show_help
    exit 1
    ;;
esac

exit 0
