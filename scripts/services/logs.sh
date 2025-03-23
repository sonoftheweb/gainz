#!/bin/bash
# Log handling functionality

# Source utilities
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
source "$SCRIPT_DIR/../core/utils.sh"

# Logs function
show_logs() {
  local FOLLOW=false
  if [ "$1" == "-f" ]; then
    FOLLOW=true
  fi

  # Show logs for all services
  show_service_logs "gateway" $GREEN 5 $FOLLOW
  show_service_logs "authentication" $CYAN 5 $FOLLOW
  show_service_logs "authorization" $MAGENTA 5 $FOLLOW
  show_service_logs "user" $BLUE 5 $FOLLOW
  show_service_logs "postgres" $YELLOW 5 $FOLLOW
  
  if [ "$FOLLOW" == false ]; then
    print_info "To follow logs in real-time, use: ./gainz.sh logs -f"
  fi
}

# Only execute directly if script is run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  show_logs "$@"
fi
