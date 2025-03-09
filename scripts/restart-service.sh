#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if service name is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Please specify a service name.${NC}"
  echo "Usage: ./restart-service.sh [service-name]"
  echo "Available services: gateway, authentication, authorization, user"
  exit 1
fi

SERVICE=$1

# Validate service name
case $SERVICE in
  gateway|authentication|authorization|user)
    # Valid service
    ;;
  *)
    echo -e "${RED}Error: Invalid service name '${SERVICE}'.${NC}"
    echo "Available services: gateway, authentication, authorization, user"
    exit 1
    ;;
esac

echo -e "${GREEN}Restarting ${SERVICE} service...${NC}"

# Restart the service
docker compose -f docker-compose.dev.yml restart $SERVICE

# Show logs from the restarted service
echo -e "${GREEN}Showing logs for ${SERVICE} service:${NC}"
docker logs gainz-$SERVICE --tail=10

echo -e "${GREEN}${SERVICE} service has been restarted.${NC}"
