#!/bin/bash
# Setup tools and environments

# Source utilities
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
source "$SCRIPT_DIR/../core/utils.sh"

# Setup editor function
setup_editor() {
  print_info "Setting up editor configuration..."
  
  # Create VSCode settings directory if it doesn't exist
  VSCODE_DIR="$PROJECT_ROOT/.vscode"
  mkdir -p "$VSCODE_DIR"
  
  # Create settings.json with recommended settings
  cat > "$VSCODE_DIR/settings.json" << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
EOF
  
  # Create extensions.json with recommended extensions
  cat > "$VSCODE_DIR/extensions.json" << 'EOF'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-azuretools.vscode-docker",
    "golang.go",
    "humao.rest-client"
  ]
}
EOF
  
  print_info "Editor configuration complete!"
  print_info "Recommended VS Code extensions:"
  echo "  - ESLint"
  echo "  - Prettier"
  echo "  - Docker"
  echo "  - Go"
  echo "  - REST Client"
  echo ""
  print_info "VS Code settings have been configured for optimal development."
}

# Run migrations
run_migrations() {
  print_info "Running database migrations..."
  
  # Make sure the services are running
  docker_compose_dev up -d postgres
  
  # Wait for Postgres to be ready
  print_warning "Waiting for Postgres to be ready..."
  sleep 5
  
  # Run migrations for all services
  print_info "Running authentication service migrations..."
  docker_compose_dev exec -T authentication npm run migrate:dev || print_warning "No migration script found for authentication service"
  
  print_info "Running authorization service migrations..."
  docker_compose_dev exec -T authorization npm run migrate:dev || print_warning "No migration script found for authorization service"
  
  print_info "Running user service migrations and generating client..."
  docker_compose_dev exec -T user npm run migrate:dev && docker_compose_dev exec -T user npm run generate
  
  print_info "All migrations completed successfully!"
}

# Run tests
run_tests() {
  print_info "Running all tests..."
  
  # Make sure the services are running and the database is migrated
  docker_compose_dev up -d
  
  # Run tests for each service
  print_info "Running authentication service tests..."
  docker_compose_dev exec -T authentication npm test
  
  print_info "Running authorization service tests..."
  docker_compose_dev exec -T authorization npm test
  
  print_info "Running user service tests..."
  docker_compose_dev exec -T user npm test
  
  print_info "Running gateway tests..."
  docker_compose_dev exec -T gateway go test ./...
  
  print_info "All tests completed!"
}

# Only execute directly if script is run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  if [ "$1" == "editor" ]; then
    setup_editor
  elif [ "$1" == "migrations" ]; then
    run_migrations
  elif [ "$1" == "tests" ]; then
    run_tests
  else
    print_error "Unknown setup command: $1"
    echo "Available options: editor, migrations, tests"
    exit 1
  fi
fi
