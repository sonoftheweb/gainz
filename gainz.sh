#!/bin/bash
# 
# Gainz Project Management Script
# Modular version with improved maintainability
#

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Source utilities
source "$SCRIPT_DIR/scripts/core/utils.sh"

# Main script logic
main() {
  local COMMAND=$1
  shift

  case "$COMMAND" in
    "dev")
      source "$SCRIPT_DIR/scripts/services/environments.sh"
      start_dev_env
      ;;
    "prod")
      source "$SCRIPT_DIR/scripts/services/environments.sh"
      start_prod_env
      ;;
    "logs")
      source "$SCRIPT_DIR/scripts/services/logs.sh"
      show_logs "$@"
      ;;
    "restart")
      source "$SCRIPT_DIR/scripts/services/restart.sh"
      restart_service "$@"
      ;;
    "test-dev")
      source "$SCRIPT_DIR/scripts/services/environments.sh"
      test_dev_mode
      ;;
    "setup"|"setup-editor")
      source "$SCRIPT_DIR/scripts/services/setup.sh"
      setup_editor
      ;;
    "migrate"|"migrations")
      source "$SCRIPT_DIR/scripts/services/setup.sh"
      run_migrations
      ;;
    "test"|"tests")
      source "$SCRIPT_DIR/scripts/services/setup.sh"
      run_tests
      ;;
    "docs"|"docs-api")
      source "$SCRIPT_DIR/scripts/services/docs.sh"
      generate_docs "$@"
      ;;
    "postman")
      source "$SCRIPT_DIR/scripts/services/docs.sh"
      generate_postman_collection "$@"
      ;;
    "help"|"")
      source "$SCRIPT_DIR/scripts/services/help.sh"
      show_help
      ;;
    *)
      source "$SCRIPT_DIR/scripts/services/help.sh"
      print_error "Unknown command: $COMMAND"
      show_help
      exit 1
      ;;
  esac
}

# Make sure all scripts are executable
chmod +x "$SCRIPT_DIR/scripts/core/utils.sh"
chmod +x "$SCRIPT_DIR/scripts/services"/*.sh

# If no arguments are provided, show help
if [ $# -eq 0 ]; then
  source "$SCRIPT_DIR/scripts/services/help.sh"
  show_help
  exit 0
fi

# Start the main function with all arguments
main "$@"
