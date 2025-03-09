const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Get service parameters from environment or command line arguments
const serviceName = process.env.SERVICE_NAME || process.argv[2] || 'authentication';
const servicePort = process.env.SERVICE_PORT || process.argv[3] || '3001';

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

const outputDir = path.join(__dirname, '../docs');
const collectionName = `Gainz ${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} API`;

console.log(`Generating Postman collection for ${serviceName} service...`);

async function generatePostmanCollection() {
  let swaggerDefinition = null;
  let lastError = null;
  
  // Try each URL in sequence until one works
  for (const url of possibleUrls) {
    try {
      console.log(`Attempting to fetch Swagger definition from: ${url}`);
      const response = await axios.get(url);
      swaggerDefinition = response.data;
      console.log(`Successfully fetched Swagger definition from: ${url}`);
      break; // If we get here, we succeeded, so exit the loop
    } catch (error) {
      console.log(`Failed to fetch from ${url}: ${error.message}`);
      lastError = error;
      // Continue to next URL
    }
  }
  
  // If we couldn't fetch from any URL, throw the last error
  if (!swaggerDefinition) {
    throw new Error(`Failed to fetch Swagger definition from any URL: ${lastError?.message}`);
  }
  
  try {

    // Create basic Postman collection structure
    const postmanCollection = {
      info: {
        name: collectionName,
        description: swaggerDefinition.info.description || '',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [],
      variable: [
        {
          key: 'baseUrl',
          value: swaggerDefinition.servers[0]?.url || `http://localhost:${servicePort}`,
          type: 'string'
        }
      ]
    };

    // Convert Swagger paths to Postman items
    for (const [path, pathMethods] of Object.entries(swaggerDefinition.paths)) {
      for (const [method, operation] of Object.entries(pathMethods)) {
        const item = {
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: [
              {
                key: 'Content-Type',
                value: 'application/json'
              }
            ],
            url: {
              raw: `{{baseUrl}}${path}`,
              host: ['{{baseUrl}}'],
              path: path.split('/').filter(p => p)
            },
            description: operation.description || ''
          },
          response: []
        };

        // Add request body if defined
        if (operation.requestBody) {
          const content = operation.requestBody.content['application/json'];
          if (content && content.schema) {
            item.request.body = {
              mode: 'raw',
              raw: JSON.stringify(content.schema.example || {}, null, 2),
              options: {
                raw: {
                  language: 'json'
                }
              }
            };
          }
        }

        // Add response examples
        if (operation.responses) {
          for (const [statusCode, response] of Object.entries(operation.responses)) {
            if (response.content && response.content['application/json'] && response.content['application/json'].schema) {
              const exampleResponse = {
                name: response.description || `Status ${statusCode}`,
                originalRequest: { ...item.request },
                status: getStatusMessage(statusCode),
                code: parseInt(statusCode),
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json'
                  }
                ],
                body: JSON.stringify(
                  extractExample(response.content['application/json'].schema),
                  null,
                  2
                ),
                description: response.description || ''
              };
              
              item.response.push(exampleResponse);
            }
          }
        }

        // Add to collection
        const tag = operation.tags && operation.tags.length > 0 ? operation.tags[0] : 'General';
        let tagFolder = postmanCollection.item.find(folder => folder.name === tag);
        
        if (!tagFolder) {
          tagFolder = {
            name: tag,
            item: []
          };
          postmanCollection.item.push(tagFolder);
        }
        
        tagFolder.item.push(item);
      }
    }

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the collection to file
    const outputPath = path.join(outputDir, 'postman_collection.json');
    fs.writeFileSync(outputPath, JSON.stringify(postmanCollection, null, 2));
    
    console.log(`Postman collection generated successfully at: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error generating Postman collection:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw new Error(`Failed to generate collection: ${error}`);
  }
}

// Helper function to get appropriate status message
function getStatusMessage(statusCode) {
  const statusMessages = {
    '200': 'OK',
    '201': 'Created',
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '403': 'Forbidden',
    '404': 'Not Found',
    '500': 'Internal Server Error'
  };
  
  return statusMessages[statusCode] || 'Unknown';
}

// Helper function to extract example from schema
function extractExample(schema) {
  if (schema.example) {
    return schema.example;
  }
  
  if (schema.properties) {
    const example = {};
    for (const [prop, propSchema] of Object.entries(schema.properties)) {
      if (propSchema.example) {
        example[prop] = propSchema.example;
      } else if (propSchema.type === 'string') {
        example[prop] = 'string';
      } else if (propSchema.type === 'number' || propSchema.type === 'integer') {
        example[prop] = 0;
      } else if (propSchema.type === 'boolean') {
        example[prop] = false;
      } else if (propSchema.type === 'object' && propSchema.properties) {
        example[prop] = extractExample(propSchema);
      } else if (propSchema.type === 'array') {
        example[prop] = [];
      }
    }
    return example;
  }
  
  return {};
}

// Run the generator if this file is executed directly
if (require.main === module) {
  generatePostmanCollection()
    .then(outputPath => {
      console.log(`You can import the collection into Postman from: ${outputPath}`);
    })
    .catch(err => {
      console.error('Failed to generate collection:', err);
      process.exit(1);
    });
}

module.exports = { generatePostmanCollection };
