#!/bin/bash
# Help documentation and command listing

# Source utilities
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
source "$SCRIPT_DIR/../core/utils.sh"

# Print help message
show_help() {
  cat << EOF
$(print_header "Gainz CLI Tool")

Usage: ./gainz.sh [command] [options]

Available commands:
  
$(print_info "Environment Commands:")
  dev              Start development environment with hot-reloading
  prod             Start production environment
  test-dev         Test hot-reloading on all services

$(print_info "Service Commands:")
  restart          Restart a specific service or all services
                   Usage: ./gainz.sh restart [service-name] [--no-cache]
                   
  logs             Show logs from all services
                   Options: -f (follow logs in real-time)
                   
$(print_info "Setup Commands:")
  setup            Configure editor settings for optimal development
  migrate          Run database migrations for all services
  test             Run tests for all services
                   
$(print_info "Documentation:")
  docs             Generate API documentation
                   Options: -v (verbose output)
                   
  postman          Generate Postman collection for all services
                   Alt usage: ./gainz.sh postman [service-name] [port]

$(print_info "Example usage:")
  ./gainz.sh dev                     # Start development environment
  ./gainz.sh restart gateway         # Restart gateway service
  ./gainz.sh restart --no-cache      # Rebuild and restart all services
  ./gainz.sh logs -f                 # Follow logs from all services
EOF
}

# Only execute directly if script is run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  show_help
fi
