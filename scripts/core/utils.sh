#!/bin/bash
# Utility functions shared across all Gainz scripts

# Define colors for better readability
export GREEN='\033[0;32m'
export RED='\033[0;31m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export MAGENTA='\033[0;35m'
export CYAN='\033[0;36m'
export NC='\033[0m' # No Color

# Get the absolute path to the project root
get_project_root() {
  echo "$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
}

# Print with colored output
print_info() {
  echo -e "${GREEN}$1${NC}"
}

print_warning() {
  echo -e "${YELLOW}$1${NC}"
}

print_error() {
  echo -e "${RED}$1${NC}"
}

print_header() {
  echo -e "${BLUE}======== $1 ========${NC}"
}

# Validate a service name against available services
validate_service() {
  local service=$1
  
  case $service in
    gateway|authentication|authorization|user)
      return 0
      ;;
    *)
      print_error "Error: Invalid service name '$service'."
      echo "Available services: gateway, authentication, authorization, user"
      return 1
      ;;
  esac
}

# Show logs for a service with color
show_service_logs() {
  local service=$1
  local color=$2
  local lines=${3:-10}
  local follow_arg=""
  
  if [ "$4" = true ]; then
    follow_arg="--follow"
  fi
  
  echo -e "${color}======== $service logs ========${NC}"
  docker logs gainz-$service --tail=$lines $follow_arg
  echo ""
}

# Execute a Docker Compose command with the appropriate file
docker_compose_dev() {
  docker compose -f docker-compose.dev.yml "$@"
}

docker_compose_prod() {
  docker compose "$@"
}
