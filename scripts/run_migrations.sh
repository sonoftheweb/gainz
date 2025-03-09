#!/bin/bash

# Generate and apply migrations for all services

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
