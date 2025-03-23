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
  echo "  postman [service] [port] Generate Postman collection for a service"
  echo "  test               Run all tests"
  echo "  migrate            Run database migrations"
  echo "  help               Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./gainz.sh dev"
  echo "  ./gainz.sh logs -f"
  echo "  ./gainz.sh restart authentication"
  echo "  ./gainz.sh postman user 3003"
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
  local NO_CACHE=false
  local ALL_SERVICES=false
  
  # Check for --no-cache flag
  if [ "$1" == "--no-cache" ]; then
    NO_CACHE=true
    SERVICE=$2
  elif [ "$2" == "--no-cache" ]; then
    NO_CACHE=true
  fi
  
  # Check if service name is provided
  if [ -z "$SERVICE" ]; then
    # If no service specified, we'll restart all services
    ALL_SERVICES=true
    echo -e "${YELLOW}No service specified, restarting all services...${NC}"
  else
    # Validate service name when one is provided
    case $SERVICE in
      gateway|authentication|authorization|user)
        # Valid service
        ;;
      *)
        echo -e "${RED}Error: Invalid service name '${SERVICE}'.${NC}"
        echo "Usage: ./gainz.sh restart [service-name] [--no-cache]"
        echo "Options:"
        echo "  --no-cache    Rebuild the service(s) without using Docker cache"
        echo "Available services: gateway, authentication, authorization, user"
        echo "If no service is specified, all services will be restarted."
        return 1
        ;;
    esac
  fi
  
  if [ "$NO_CACHE" = true ]; then
    # Bring down the entire stack first to ensure clean rebuilds
    echo -e "${YELLOW}Stopping all services...${NC}"
    docker compose -f docker-compose.dev.yml down
    
    if [ "$ALL_SERVICES" = true ]; then
      echo -e "${GREEN}Rebuilding all services without cache...${NC}"
      # Rebuild all services without cache
      docker compose -f docker-compose.dev.yml build --no-cache
    else
      echo -e "${GREEN}Rebuilding ${SERVICE} service without cache...${NC}"
      # Rebuild the specific service without cache
      docker compose -f docker-compose.dev.yml build --no-cache $SERVICE
    fi
    
    # Start the entire stack again
    echo -e "${YELLOW}Starting all services...${NC}"
    docker compose -f docker-compose.dev.yml up -d
  else
    if [ "$ALL_SERVICES" = true ]; then
      echo -e "${GREEN}Restarting all services...${NC}"
      # Restart all services
      docker compose -f docker-compose.dev.yml restart
    else
      echo -e "${GREEN}Restarting ${SERVICE} service...${NC}"
      # Restart the specific service
      docker compose -f docker-compose.dev.yml restart $SERVICE
    fi
  fi
  
  # Show logs based on whether we're handling a specific service or all services
  if [ "$ALL_SERVICES" = true ]; then
    echo -e "${GREEN}All services have been restarted.${NC}"
    echo -e "${YELLOW}Use './gainz.sh logs' to view logs.${NC}"
  else
    # Show logs from the restarted service
    echo -e "${GREEN}Showing logs for ${SERVICE} service:${NC}"
    docker logs gainz-$SERVICE --tail=10
    echo -e "${GREEN}${SERVICE} service has been restarted.${NC}"
  fi
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
  local RESET=false
  
  # Parse command-line arguments
  while [ $# -gt 0 ]; do
    case "$1" in
      --reset)
        RESET=true
        ;;
    esac
    shift
  done
  
  if [ "$RESET" = true ]; then
    echo "${YELLOW}WARNING: Reset flag detected. This will reset your database and all data will be lost.${NC}"
    read -p "Are you sure you want to continue? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Database reset cancelled."
      return 1
    fi
  fi

  # Check if database service is running
  if ! docker ps | grep -q "gainz-database"; then
    echo -e "${YELLOW}Database service not running. Starting services...${NC}"
    start_dev
  fi

  echo "${GREEN}Using centralized database service for migrations...${NC}"
  
  # Run migrations using the database service
  if [ "$RESET" = true ]; then
    echo "${YELLOW}Resetting database schema...${NC}"
    docker compose -f docker-compose.dev.yml exec database npx prisma migrate reset --force
  else
    echo "${YELLOW}Applying database migrations...${NC}"
    docker compose -f docker-compose.dev.yml exec database npx prisma migrate dev --name migration
  fi
  
  # Generate Prisma clients for all services
  echo "${GREEN}Generating Prisma clients for all services...${NC}"
  docker compose -f docker-compose.dev.yml exec authentication npx prisma generate
  docker compose -f docker-compose.dev.yml exec authorization npx prisma generate
  docker compose -f docker-compose.dev.yml exec user npx prisma generate
  
  # Restart services to ensure they pick up the new schema
  echo "${GREEN}Restarting services to apply schema changes...${NC}"
  restart_service authentication
  restart_service authorization
  restart_service user
  
  echo "${GREEN}Migrations applied and Prisma clients regenerated for all services.${NC}"
  echo "${YELLOW}Note: All migrations are now managed by the database service.${NC}"
  echo "${YELLOW}Individual service schema files are used for type generation only.${NC}"
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
  
  # Check if services are running
  if ! docker ps | grep -q "gainz-"; then
    echo -e "${RED}No Gainz services appear to be running. Start them with './gainz.sh dev' first.${NC}"
    return 1
  fi
  
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
  for SERVICE_DIR in $SERVICES; do
    SERVICE_NAME=$(basename "$SERVICE_DIR")
    echo -e "${YELLOW}Processing $SERVICE_NAME service...${NC}"
    
    # Check if the service has a Swagger config
    if [ -f "$SERVICE_DIR/src/config/swagger.ts" ]; then
      echo -e "${GREEN}Found Swagger configuration for $SERVICE_NAME${NC}"
      
      # Get the port for this service from the docker-compose.dev.yml file
      local PORT=$(grep -A 20 "$SERVICE_NAME:" "$SCRIPT_DIR/docker-compose.dev.yml" | grep "ports:" -A 1 | grep -o "[0-9]\+:[0-9]\+" | head -1 | cut -d: -f1)
      
      if [ -n "$PORT" ]; then
        echo -e "${GREEN}API documentation for $SERVICE_NAME is available at:${NC}"
        echo -e "${CYAN}http://localhost:$PORT/api-docs${NC}"
      else
        echo -e "${YELLOW}Could not determine port for $SERVICE_NAME service.${NC}"
      fi
    else
      echo -e "${YELLOW}No Swagger configuration found for $SERVICE_NAME, skipping...${NC}"
    fi
  done
  
  echo ""
  echo -e "${GREEN}====================================================${NC}"
  echo -e "${GREEN}API documentation for each service can be accessed at:${NC}"
  echo -e "${CYAN}Authentication: http://localhost:3001/api-docs${NC}"
  echo -e "${CYAN}Authorization: http://localhost:3002/api-docs${NC}"
  echo -e "${CYAN}User:          http://localhost:3003/api-docs${NC}"
  echo -e "${CYAN}Image Upload:   http://localhost:3004/api-docs${NC}"
  echo -e "${GREEN}====================================================${NC}"
  echo ""
  echo -e "${YELLOW}Note: The services must be running for the documentation to be accessible.${NC}"
  echo -e "${YELLOW}If you're seeing 404 errors, ensure the services are running with './gainz.sh dev'${NC}"
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

# Generate Postman collection
generate_postman_collection() {
  local SERVICE=$1
  local PORT=$2
  local COMBINED_ONLY=${3:-false}
  
  # If no service specified, generate for all services with Swagger docs
  if [ -z "$SERVICE" ]; then
    echo -e "${GREEN}Generating Postman collections for all services...${NC}"
    
    # Define services with potential API docs
    local API_SERVICES=("authentication" "authorization" "user" "image-upload")
    local SUCCESSFUL_COLLECTIONS=()
    
    # Make sure docs directory exists
    mkdir -p "$SCRIPT_DIR/docs"
    
    # Generate Postman collection for each service
    for service in "${API_SERVICES[@]}"; do
      # Check if the service directory exists and is running
      if [ -d "$SCRIPT_DIR/services/$service" ] && docker ps | grep -q "gainz-$service"; then
        echo -e "${CYAN}Generating Postman collection for $service service...${NC}"
        
        # Try to generate the collection
        generate_single_collection "$service"
        
        # Check if the collection was created
        if [ -f "$SCRIPT_DIR/docs/${service}-postman-collection.json" ]; then
          SUCCESSFUL_COLLECTIONS+=("$SCRIPT_DIR/docs/${service}-postman-collection.json")
        fi
      fi
    done
    
    # Combine all successful collections into a single file
    if [ ${#SUCCESSFUL_COLLECTIONS[@]} -gt 0 ]; then
      echo -e "${CYAN}Combining collections into a single file...${NC}"
      create_combined_collection "${SUCCESSFUL_COLLECTIONS[@]}"
      
      # Remove individual files if combined-only mode is enabled
      if [ "$COMBINED_ONLY" = true ]; then
        echo -e "${YELLOW}Removing individual collection files...${NC}"
        rm -f "${SUCCESSFUL_COLLECTIONS[@]}"
      fi
    else
      echo -e "${RED}No collections were successfully generated.${NC}"
    fi
    
    echo -e "${GREEN}Postman collection generation complete!${NC}"
    return 0
  fi
  
  # Handle single service case by calling the single collection generator
  generate_single_collection "$SERVICE" "$PORT"
  
  # Return success
  return 0
}

# Generate a single service's Postman collection
generate_single_collection() {
  local SERVICE=$1
  local PORT=$2
  
  # Handle single service case
  if [ -z "$PORT" ]; then
    case $SERVICE in
      authentication)
        PORT="3001"
        ;;
      authorization)
        PORT="3002"
        ;;
      user)
        PORT="3003"
        ;;
      image-upload)
        PORT="3004"
        ;;
      *)
        PORT="3001"
        ;;
    esac
  fi
  
  echo -e "${GREEN}Generating Postman collection for ${SERVICE} service on port ${PORT}...${NC}"
  
  # Make sure docs directory exists
  mkdir -p "$SCRIPT_DIR/docs"
  
  # Use the docker container to run the script since it already has the dependencies
  echo -e "${YELLOW}Using Docker to generate Postman collection...${NC}"
  
  # Check if services are running
  if ! docker ps | grep -q "gainz-$SERVICE"; then
    echo -e "${RED}Service $SERVICE is not running. Start it with './gainz.sh dev' first.${NC}"
    return 1
  fi
  
  # Create a simple script that uses fetch (built into Node.js) instead of axios
  local TEMP_JS_FILE=$(mktemp)
  cat > "$TEMP_JS_FILE" << 'EOF'
// Script to generate Postman collection from Swagger definition

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Get service parameters from environment
const serviceName = process.env.SERVICE_NAME;
const servicePort = process.env.SERVICE_PORT;

// Utility function to make HTTP requests (simpler than using axios)
async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Status Code: ${res.statusCode}`));
      }
      
      const data = [];
      res.on('data', chunk => {
        data.push(chunk);
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(data).toString());
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Possible URLs to try - will try each in order until one works
const possibleUrls = [
  // Internal Docker network URL (service-to-service)
  `http://${serviceName}:${servicePort}/api-docs.json`,
  // Docker host networking fallback (for Linux)
  `http://172.17.0.1:${servicePort}/api-docs.json`,
  // macOS/Windows Docker desktop standard hostname
  `http://host.docker.internal:${servicePort}/api-docs.json`,
  // Localhost fallback (for non-Docker environments)
  `http://localhost:${servicePort}/api-docs.json`
];

const outputDir = '/app/docs';
const collectionName = `Gainz ${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} API`;

console.log(`Generating Postman collection for ${serviceName} service...`);

async function generatePostmanCollection() {
  let swaggerDefinition = null;
  let lastError = null;
  
  // Try each URL in sequence until one works
  for (const url of possibleUrls) {
    try {
      console.log(`Attempting to fetch Swagger definition from: ${url}`);
      const data = await fetchJson(url);
      swaggerDefinition = data;
      console.log(`Successfully fetched Swagger definition from: ${url}`);
      break; // If we get here, we succeeded, so exit the loop
    } catch (error) {
      console.log(`Failed to fetch from ${url}: ${error.message}`);
      lastError = error;
      // Continue to next URL
    }
  }
  
  if (!swaggerDefinition) {
    console.error(`Could not fetch Swagger definition from any URL. Last error: ${lastError?.message}`);
    process.exit(1);
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Initialize Postman collection
  const collection = {
    info: {
      _postman_id: Date.now().toString(),
      name: collectionName,
      description: swaggerDefinition.info.description || `Postman Collection for ${serviceName} service`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: []
  };
  
  // Process Swagger paths
  for (const path in swaggerDefinition.paths) {
    for (const method in swaggerDefinition.paths[path]) {
      const endpoint = swaggerDefinition.paths[path][method];
      
      // Determine content type from Swagger
      let contentType = "application/json";
      
      // Check if endpoint consumes multipart/form-data
      if (endpoint.consumes && endpoint.consumes.includes('multipart/form-data')) {
        contentType = "multipart/form-data";
      }
      
      // Create Postman request
      const request = {
        name: endpoint.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [
            {
              key: "Content-Type",
              value: contentType
            }
          ],
          url: {
            // Map service names to their gateway path prefixes
            raw: `{{gatewayUrl}}${getGatewayPath(serviceName, path)}`,
            host: ["{{gatewayUrl}}"],
            path: getGatewayPath(serviceName, path).split('/').filter(p => p)
          },
          description: endpoint.description || "",
        },
        response: []
      };
      
      // Add request body if it exists
      if (endpoint.requestBody && endpoint.requestBody.content) {
        // Handle multipart/form-data (file uploads)
        if (endpoint.requestBody.content['multipart/form-data']) {
          const schema = endpoint.requestBody.content['multipart/form-data'].schema;
          const formItems = [];
          
          // Process form fields from schema properties
          if (schema && schema.properties) {
            for (const propName in schema.properties) {
              const prop = schema.properties[propName];
              let type = "text";
              
              // If this is a file upload field
              if (prop.format === "binary" || prop.type === "file") {
                type = "file";
              }
              
              formItems.push({
                key: propName,
                type: type,
                src: [],
                description: prop.description || ""
              });
            }
          }
          
          request.request.body = {
            mode: "formdata",
            formdata: formItems
          };
        }
        // Handle standard JSON bodies
        else if (endpoint.requestBody.content['application/json']) {
          const schema = endpoint.requestBody.content['application/json'].schema;
          request.request.body = {
            mode: "raw",
            raw: JSON.stringify(extractExample(schema) || {}, null, 2),
            options: {
              raw: {
                language: "json"
              }
            }
          };
        }
      }
      
      // Add query parameters if they exist
      if (endpoint.parameters) {
        const queryParams = endpoint.parameters.filter(p => p.in === 'query');
        if (queryParams.length > 0) {
          request.request.url.query = queryParams.map(p => ({
            key: p.name,
            value: "",
            description: p.description || "",
            disabled: !p.required
          }));
        }
        
        // Add path parameters to URL
        const pathParams = endpoint.parameters.filter(p => p.in === 'path');
        if (pathParams.length > 0) {
          // Replace path params in the URL
          pathParams.forEach(p => {
            request.request.url.raw = request.request.url.raw.replace(`{${p.name}}`, `:${p.name}`);
            // Update each path segment that contains this parameter
            for (let i = 0; i < request.request.url.path.length; i++) {
              if (request.request.url.path[i].includes(`{${p.name}}`)) {
                request.request.url.path[i] = request.request.url.path[i].replace(`{${p.name}}`, `:${p.name}`);
              }
            }
          });
        }
      }
      
      // Add example responses
      if (endpoint.responses) {
        for (const statusCode in endpoint.responses) {
          const response = endpoint.responses[statusCode];
          const exampleResponse = {
            name: `${statusCode} ${getStatusMessage(statusCode)}`,
            originalRequest: request.request,
            status: statusCode,
            code: parseInt(statusCode, 10),
            _postman_previewlanguage: "json",
            header: null,
            cookie: [],
            body: ""
          };
          
          if (response.content && response.content['application/json'] && response.content['application/json'].schema) {
            const schema = response.content['application/json'].schema;
            exampleResponse.body = JSON.stringify(extractExample(schema) || {}, null, 2);
          }
          
          request.response.push(exampleResponse);
        }
      }
      
      // Group requests by tags
      const tag = endpoint.tags && endpoint.tags.length > 0 ? endpoint.tags[0] : 'default';
      
      // Find or create the folder for this tag
      let folder = collection.item.find(item => item.name === tag);
      if (!folder) {
        folder = {
          name: tag,
          item: []
        };
        collection.item.push(folder);
      }
      
      // Add the request to the folder
      folder.item.push(request);
    }
  }
  
  // Add variables
  collection.variable = [
    {
      key: "gatewayUrl",
      value: "http://localhost:80",
      type: "string"
    }
  ];
  
  // Write collection to file
  const outputPath = path.join(outputDir, `${serviceName}-postman-collection.json`);
  fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));
  
  console.log(`Postman collection generated at ${outputPath}`);
  return outputPath;
}

// Helper function to get appropriate status message
function getStatusMessage(statusCode) {
  const statusMessages = {
    '200': 'OK',
    '201': 'Created',
    '204': 'No Content',
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '403': 'Forbidden',
    '404': 'Not Found',
    '500': 'Internal Server Error'
  };
  
  return statusMessages[statusCode] || 'Unknown';
}

// Helper function to get the gateway path for a service
function getGatewayPath(serviceName, path) {
  switch(serviceName) {
    case 'authentication':
      return path; // The authentication paths already include /api/auth/
    case 'authorization':
      return path; // Authorization paths already include /api/authorize/
    case 'user':
      return '/api/users' + path;
    case 'image-upload':
      return '/api/images' + path;
    default:
      return '/api/' + serviceName + path;
  }
}

// Helper function to extract example from schema
function extractExample(schema) {
  if (!schema) return null;
  
  // If an example is provided, use it
  if (schema.example) return schema.example;
  
  // Otherwise, generate example based on schema type
  if (schema.type === 'object') {
    const example = {};
    if (schema.properties) {
      for (const prop in schema.properties) {
        example[prop] = extractExample(schema.properties[prop]);
      }
    }
    return example;
  } else if (schema.type === 'array') {
    return [extractExample(schema.items)];
  } else if (schema.type === 'string') {
    return schema.enum ? schema.enum[0] : "string";
  } else if (schema.type === 'number' || schema.type === 'integer') {
    return 0;
  } else if (schema.type === 'boolean') {
    return false;
  }
  
  return null;
}

// Run the generator
generatePostmanCollection()
  .then(outputPath => {
    console.log(`Postman collection generation complete!`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`Error generating Postman collection: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
EOF

  # Run the script inside the service container
  docker exec -i gainz-$SERVICE sh -c "cat > /tmp/generate-postman.js" < "$TEMP_JS_FILE"
  docker exec -e SERVICE_NAME="$SERVICE" -e SERVICE_PORT="$PORT" gainz-$SERVICE node /tmp/generate-postman.js
  
  # Copy the generated collection from the container
  docker cp gainz-$SERVICE:/app/docs/${SERVICE}-postman-collection.json "$SCRIPT_DIR/docs/"
  
  # Clean up
  docker exec gainz-$SERVICE rm /tmp/generate-postman.js
  rm "$TEMP_JS_FILE"
  
  echo -e "${GREEN}Postman collection generated at $SCRIPT_DIR/docs/${SERVICE}-postman-collection.json${NC}"
}

# Create a combined Postman collection from individual service collections
create_combined_collection() {
  local COLLECTIONS=($@)
  local OUTPUT_FILE="$SCRIPT_DIR/docs/gainz-api-collection.json"
  
  echo -e "${CYAN}Creating combined collection from ${#COLLECTIONS[@]} services...${NC}"
  
  # Create a temporary JavaScript file to combine collections
  local TEMP_JS_FILE=$(mktemp)
  cat > "$TEMP_JS_FILE" << 'EOF'
// Script to combine multiple Postman collections into one
const fs = require('fs');
const path = require('path');

// Get collection file paths passed as arguments
const collectionPaths = process.argv.slice(2);
console.log(`Processing ${collectionPaths.length} collections`);

// Create a new combined collection
const combinedCollection = {
  info: {
    _postman_id: Date.now().toString(),
    name: 'Gainz API',
    description: 'Combined API collection for all Gainz microservices',
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [],
  variable: [
    {
      key: "gatewayUrl",
      value: "http://localhost:80",
      type: "string"
    }
  ]
};

// Process each collection file
collectionPaths.forEach(collectionPath => {
  try {
    console.log(`Processing ${collectionPath}`);
    // Read the collection file
    const collectionData = fs.readFileSync(collectionPath, 'utf8');
    const collection = JSON.parse(collectionData);
    
    // Extract service name from filename
    const filename = path.basename(collectionPath);
    const serviceName = filename.replace('-postman-collection.json', '');
    
    // Create a folder for this service
    const serviceFolder = {
      name: serviceName.charAt(0).toUpperCase() + serviceName.slice(1) + ' API',
      item: collection.item || []
    };
    
    // Add the service folder to the combined collection
    combinedCollection.item.push(serviceFolder);
    
    console.log(`Added collection: ${filename}`);
  } catch (error) {
    console.error(`Error processing collection ${collectionPath}: ${error.message}`);
  }
});

// Write the combined collection to file
const outputPath = '/app/docs/gainz-api-collection.json';
fs.writeFileSync(outputPath, JSON.stringify(combinedCollection, null, 2));

// Create a Postman environment file
const environment = {
  id: Date.now().toString() + '-env',
  name: 'Gainz API Environment',
  values: [
    {
      key: "gatewayUrl",
      value: "http://localhost:80",
      enabled: true
    }
  ],
  _postman_variable_scope: "environment"
};

const envPath = '/app/docs/gainz-api-environment.json';
fs.writeFileSync(envPath, JSON.stringify(environment, null, 2));

console.log(`Combined collection created at ${outputPath}`);
console.log(`Environment file created at ${envPath}`);
EOF

  # Find a running service container to execute the script
  local ACTIVE_SERVICE=""
  for service in "authentication" "authorization" "user" "image-upload"; do
    if docker ps | grep -q "gainz-$service"; then
      ACTIVE_SERVICE="$service"
      break
    fi
  done
  
  if [ -z "$ACTIVE_SERVICE" ]; then
    echo -e "${RED}No running service containers found. Start services with './gainz.sh dev' first.${NC}"
    return 1
  fi
  
  # Copy the script to the container
  docker cp "$TEMP_JS_FILE" "gainz-$ACTIVE_SERVICE:/tmp/combine-collections.js"
  
  # Copy all collection files to the container
  for coll in "${COLLECTIONS[@]}"; do
    docker cp "$coll" "gainz-$ACTIVE_SERVICE:/app/docs/$(basename "$coll")"
  done
  
  # Build the container paths for the collections
  local CONTAINER_PATHS=""
  for coll in "${COLLECTIONS[@]}"; do
    CONTAINER_PATHS="$CONTAINER_PATHS /app/docs/$(basename "$coll")"
  done
  
  # Run the script in the container
  docker exec gainz-$ACTIVE_SERVICE node /tmp/combine-collections.js $CONTAINER_PATHS
  
  # Copy the generated files back
  docker cp "gainz-$ACTIVE_SERVICE:/app/docs/gainz-api-collection.json" "$SCRIPT_DIR/docs/"
  docker cp "gainz-$ACTIVE_SERVICE:/app/docs/gainz-api-environment.json" "$SCRIPT_DIR/docs/"
  
  # Clean up
  docker exec gainz-$ACTIVE_SERVICE rm "/tmp/combine-collections.js"
  rm -f "$TEMP_JS_FILE"
  
  echo -e "${GREEN}Combined Postman collection created at $OUTPUT_FILE${NC}"
  echo -e "${GREEN}Environment file created at $SCRIPT_DIR/docs/gainz-api-environment.json${NC}"
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
  postman)
    if [ "$2" = "--combined-only" ]; then
      generate_postman_collection "" "" true
    else
      generate_postman_collection "$2" "$3" false
    fi
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
