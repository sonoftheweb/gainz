#!/bin/bash
# Postman collection generation functionality

# Source utilities
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
source "$SCRIPT_DIR/../core/utils.sh"

# Generate Postman collection
generate_postman_collection() {
  if [ -z "$1" ]; then
    print_info "Generating Postman collections for all services..."
    
    # Create collections directory if it doesn't exist
    mkdir -p "$PROJECT_ROOT/docs/postman"
    
    # List of services and their ports
    local services=(
      "authentication:3001"
      "authorization:3002"
      "user:3003"
      "image-upload:3004"
    )
    
    # Generate collection for each service
    local collection_files=()
    for service_info in "${services[@]}"; do
      IFS=':' read -r service port <<< "$service_info"
      
      # Check if service is running before attempting to generate collection
      if docker ps | grep -q "gainz-$service"; then
        print_info "Generating collection for $service service on port $port..."
        generate_single_collection "$service" "$port"
        collection_files+=("$PROJECT_ROOT/docs/$service-postman-collection.json")
      else
        print_warning "Service $service is not running, skipping Postman collection generation"
      fi
    done
    
    # Check if we have any collection files to combine
    if [ ${#collection_files[@]} -gt 0 ]; then
      # Create combined collection from all generated collections
      create_combined_collection "${collection_files[@]}"
    else
      print_error "No services were available to generate Postman collections!"
    fi
    
    print_info "Postman collections generated successfully!"
    print_info "Collections available at: $PROJECT_ROOT/docs/"
  else
    # Generate collection for a specific service
    local service=$1
    local port=$2
    
    if [ -z "$port" ]; then
      print_error "Please specify a port number."
      echo "Usage: ./gainz.sh postman <service> <port>"
      return 1
    fi
    
    generate_single_collection "$service" "$port"
    print_info "Postman collection for $service generated successfully!"
  fi
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
  
  print_info "Generating Postman collection for ${SERVICE} service on port ${PORT}..."
  
  # Make sure docs directory exists
  mkdir -p "$PROJECT_ROOT/docs"
  
  # Use the docker container to run the script since it already has the dependencies
  print_warning "Using Docker to generate Postman collection..."
  
  # Check if services are running
  if ! docker ps | grep -q "gainz-$SERVICE"; then
    print_error "Service $SERVICE is not running. Start it with './gainz.sh dev' first."
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
      // Check if path already includes /api/images to avoid duplication
      if (path.startsWith('/api/images')) {
        return path;
      } else {
        return '/api/images' + path;
      }
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
  docker cp gainz-$SERVICE:/app/docs/${SERVICE}-postman-collection.json "$PROJECT_ROOT/docs/"
  
  # Clean up
  docker exec gainz-$SERVICE rm /tmp/generate-postman.js
  rm "$TEMP_JS_FILE"
  
  print_info "Postman collection generated at $PROJECT_ROOT/docs/${SERVICE}-postman-collection.json"
}

# Create a combined Postman collection from individual service collections
create_combined_collection() {
  local COLLECTIONS=("$@")
  local OUTPUT_FILE="$PROJECT_ROOT/docs/gainz-api-collection.json"
  
  print_info "Creating combined collection from ${#COLLECTIONS[@]} services..."
  
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
    print_error "No running service containers found. Start services with './gainz.sh dev' first."
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
  docker cp "gainz-$ACTIVE_SERVICE:/app/docs/gainz-api-collection.json" "$PROJECT_ROOT/docs/"
  docker cp "gainz-$ACTIVE_SERVICE:/app/docs/gainz-api-environment.json" "$PROJECT_ROOT/docs/"
  
  # Clean up
  docker exec gainz-$ACTIVE_SERVICE rm /tmp/combine-collections.js
  rm "$TEMP_JS_FILE"
  
  print_info "Combined Postman collection generated at: $PROJECT_ROOT/docs/gainz-api-collection.json"
  print_info "Postman environment file generated at: $PROJECT_ROOT/docs/gainz-api-environment.json"
}

# Show help for postman commands
show_postman_help() {
  echo "Usage: ./gainz.sh postman [OPTION] [SERVICE] [PORT]"
  echo ""
  echo "Generate Postman collections for Gainz services"
  echo ""
  echo "Options:"
  echo "  <no arguments>    Generate collections for all services"
  echo "  <service> <port>  Generate collection for a specific service on the specified port"
  echo ""
  echo "Examples:"
  echo "  ./gainz.sh postman                  # Generate for all services with default ports"
  echo "  ./gainz.sh postman authentication 3001  # Generate for the authentication service"
  echo ""
}

# Only execute directly if script is run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  # Check for help flags
  if [[ "$1" == "--help" || "$1" == "-h" || "$1" == "help" ]]; then
    show_postman_help
    exit 0
  fi
  
  if [ "$1" == "generate" ]; then
    # Check if the next parameter is a help flag
    if [[ "$2" == "--help" || "$2" == "-h" || "$2" == "help" ]]; then
      show_postman_help
      exit 0
    fi
    generate_postman_collection "${@:2}"
  elif [ "$1" == "combine" ]; then
    create_combined_collection "${@:2}"
  else
    if [ -z "$1" ]; then
      # No arguments - generate for all services
      generate_postman_collection
    else
      print_error "Unknown postman command: $1"
      show_postman_help
      exit 1
    fi
  fi
fi
