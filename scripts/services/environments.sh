#!/bin/bash
# Environment management functions for development and production

# Source utilities
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
source "$SCRIPT_DIR/../core/utils.sh"

# Dev environment function
start_dev_env() {
  print_info "Starting development environment..."
  
  # Stop and remove any existing containers
  docker compose down
  
  # Start development environment
  docker_compose_dev up -d
  
  # Show API address
  echo ""
  echo "🚀 Gainz API is now running!"
  echo "📝 Access the API at: http://localhost"
  echo ""
  
  # Show logs
  docker_compose_dev logs -f
}

# Production environment function
start_prod_env() {
  print_info "Starting production environment..."
  
  # Stop and remove any existing containers
  docker_compose_dev down
  
  # Start production environment
  docker compose up -d
  
  # Show logs
  docker compose logs -f
}

# Test development mode function
test_dev_mode() {
  echo "Testing development mode for all services..."
  
  # Test authentication service
  echo "Adding a test comment to authentication service..."
  echo "// Test comment $(date)" >> "$PROJECT_ROOT/services/authentication/src/controllers/authController.ts"
  sleep 2
  docker logs gainz-authentication --tail=5
  echo ""
  
  # Test authorization service
  echo "Adding a test comment to authorization service..."
  echo "// Test comment $(date)" >> "$PROJECT_ROOT/services/authorization/src/controllers/authorizationController.ts"
  sleep 2
  docker logs gainz-authorization --tail=5
  echo ""
  
  # Test user service
  echo "Adding a test comment to user service..."
  echo "// Test comment $(date)" >> "$PROJECT_ROOT/services/user/src/controllers/userController.ts"
  sleep 2
  docker logs gainz-user --tail=5
  echo ""
  
  # Test gateway service
  echo "Adding a test comment to gateway service..."
  echo "// Test comment $(date)" >> "$PROJECT_ROOT/services/gateway/cmd/server/main.go"
  sleep 2
  docker logs gainz-gateway --tail=5
  echo ""
}

# Only execute directly if script is run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  if [ "$1" == "dev" ]; then
    start_dev_env
  elif [ "$1" == "prod" ]; then
    start_prod_env
  elif [ "$1" == "test" ]; then
    test_dev_mode
  else
    print_error "Unknown environment: $1"
    echo "Available options: dev, prod, test"
    exit 1
  fi
fi
