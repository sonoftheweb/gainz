#!/bin/bash

# Stop and remove any existing containers
docker compose -f docker-compose.dev.yml down

# Start production environment
docker compose up -d

# Show logs
docker compose logs -f
