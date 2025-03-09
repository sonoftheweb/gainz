#!/bin/bash

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Option to follow logs
FOLLOW=false
if [ "$1" == "-f" ]; then
  FOLLOW=true
fi

# Function to show logs with color and service name
show_logs() {
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
  show_logs "gateway" $MAGENTA 10
  show_logs "authentication" $GREEN 10
  show_logs "authorization" $BLUE 10
  show_logs "user" $CYAN 10
  show_logs "postgres" $YELLOW 5
  
  echo -e "${GREEN}To follow logs in real-time, use: ./logs.sh -f${NC}"
fi
