#!/bin/bash
# Service restart functionality

# Source utilities
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
source "$SCRIPT_DIR/../core/utils.sh"

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
    print_warning "No service specified, restarting all services..."
  else
    # Validate service name when one is provided
    if ! validate_service "$SERVICE"; then
      echo "Usage: ./gainz.sh restart [service-name] [--no-cache]"
      echo "Options:"
      echo "  --no-cache    Rebuild the service(s) without using Docker cache"
      echo "If no service is specified, all services will be restarted."
      return 1
    fi
  fi
  
  if [ "$NO_CACHE" = true ]; then
    # Bring down the entire stack first to ensure clean rebuilds
    print_warning "Stopping all services..."
    docker_compose_dev down
    
    if [ "$ALL_SERVICES" = true ]; then
      print_info "Rebuilding all services without cache..."
      # Rebuild all services without cache
      docker_compose_dev build --no-cache
    else
      print_info "Rebuilding ${SERVICE} service without cache..."
      # Rebuild the specific service without cache
      docker_compose_dev build --no-cache $SERVICE
    fi
    
    # Start the entire stack again
    print_warning "Starting all services..."
    docker_compose_dev up -d
  else
    if [ "$ALL_SERVICES" = true ]; then
      print_info "Restarting all services..."
      # Restart all services
      docker_compose_dev restart
    else
      print_info "Restarting ${SERVICE} service..."
      # Restart the specific service
      docker_compose_dev restart $SERVICE
    fi
  fi
  
  # Show logs based on whether we're handling a specific service or all services
  if [ "$ALL_SERVICES" = true ]; then
    print_info "All services have been restarted."
    print_warning "Use './gainz.sh logs' to view logs."
  else
    # Show logs from the restarted service
    print_info "Showing logs for ${SERVICE} service:"
    docker logs gainz-$SERVICE --tail=10
    print_info "${SERVICE} service has been restarted."
  fi
}

# Only execute directly if script is run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  restart_service "$@"
fi
