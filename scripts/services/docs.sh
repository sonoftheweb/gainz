#!/bin/bash
# Documentation and API collection generation

# Source utilities
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
source "$SCRIPT_DIR/../core/utils.sh"

# Generate API documentation
generate_docs() {
  local VERBOSE=false
  if [ "$1" == "-v" ]; then
    VERBOSE=true
  fi
  
  print_info "Generating API documentation..."
  
  # Create docs directory if it doesn't exist
  mkdir -p "$PROJECT_ROOT/docs/api"
  
  # Generate documentation for each service
  generate_service_docs "authentication" "3001" $VERBOSE
  generate_service_docs "authorization" "3002" $VERBOSE
  generate_service_docs "user" "3003" $VERBOSE
  
  # Create index.html for docs
  create_docs_index
  
  print_info "Documentation generation complete!"
  print_info "View documentation at: /docs/api/index.html"
}

# Generate documentation for a specific service
generate_service_docs() {
  local service=$1
  local port=$2
  local verbose=$3
  
  print_info "Generating documentation for $service service..."
  
  if [ "$verbose" = true ]; then
    echo "Service: $service"
    echo "Port: $port"
    echo "Output directory: $PROJECT_ROOT/docs/api/$service"
  fi
  
  # Make sure the service is running
  if ! docker ps | grep -q "gainz-$service"; then
    print_warning "$service service is not running, starting it..."
    docker_compose_dev up -d $service
    sleep 5
  fi
  
  # Create output directory
  mkdir -p "$PROJECT_ROOT/docs/api/$service"
  
  # Use appropriate tool to generate docs based on service type
  if [ "$service" == "gateway" ]; then
    # Go service uses Swagger
    docker_compose_dev exec -T $service go run ./cmd/docs/main.go -output ../../../docs/api/$service
  else
    # Node services use TypeDoc
    docker_compose_dev exec -T $service npm run docs
    
    # Copy docs from the container to host
    docker cp "gainz-$service:/app/docs" "$PROJECT_ROOT/docs/api/$service"
  fi
  
  if [ "$verbose" = true ]; then
    echo "Documentation for $service service generated successfully!"
  fi
}

# Create an index.html to navigate between service docs
create_docs_index() {
  local index_file="$PROJECT_ROOT/docs/api/index.html"
  
  cat > "$index_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Gainz API Documentation</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 0;
      padding: 20px;
      line-height: 1.6;
    }
    h1 { color: #333; }
    .services {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 20px;
    }
    .service {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      width: 280px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .service h2 { margin-top: 0; color: #2a5885; }
    .service a {
      display: inline-block;
      margin-top: 10px;
      text-decoration: none;
      background: #4CAF50;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
    }
    .service a:hover { background: #45a049; }
  </style>
</head>
<body>
  <h1>Gainz API Documentation</h1>
  <p>Select a service to view its API documentation.</p>
  
  <div class="services">
    <div class="service">
      <h2>Gateway</h2>
      <p>Central API gateway that routes requests to appropriate microservices.</p>
      <a href="./gateway/index.html">View Documentation</a>
    </div>
    
    <div class="service">
      <h2>Authentication</h2>
      <p>Handles user login, registration, and token validation.</p>
      <a href="./authentication/index.html">View Documentation</a>
    </div>
    
    <div class="service">
      <h2>Authorization</h2>
      <p>Manages user permissions and access control.</p>
      <a href="./authorization/index.html">View Documentation</a>
    </div>
    
    <div class="service">
      <h2>User</h2>
      <p>Manages user profiles and user-specific data.</p>
      <a href="./user/index.html">View Documentation</a>
    </div>
  </div>
</body>
</html>
EOF
}

# Generate Postman collection using the specialized script
generate_postman_collection() {
  # Source the postman.sh script
  source "$SCRIPT_DIR/postman.sh"
  
  # Check for help flags
  if [[ "$1" == "--help" || "$1" == "-h" || "$1" == "help" ]]; then
    "$SCRIPT_DIR/postman.sh" --help
    return 0
  fi
  
  if [ -z "$1" ]; then
    print_info "Generating Postman collections for all services..."
    
    # Call the specialized function from postman.sh
    "$SCRIPT_DIR/postman.sh" generate
  else
    local service=$1
    local port=$2
    
    if [ -z "$port" ]; then
      # Check if the first argument is actually a command like 'generate' or 'combine'
      if [[ "$service" == "generate" || "$service" == "combine" ]]; then
        "$SCRIPT_DIR/postman.sh" "$service"
        return $?
      fi
      
      # Otherwise, it's a service name without a port
      print_error "Please specify a port number."
      "$SCRIPT_DIR/postman.sh" --help
      return 1
    fi
    
    # Call the specialized function from postman.sh with service and port
    "$SCRIPT_DIR/postman.sh" generate "$service" "$port"
  fi
}

# Only execute directly if script is run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  if [ "$1" == "api" ]; then
    generate_docs "${@:2}"
  elif [ "$1" == "postman" ]; then
    generate_postman_collection "${@:2}"
  else
    print_error "Unknown docs command: $1"
    echo "Available options: api, postman"
    exit 1
  fi
fi
