#!/bin/bash

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
