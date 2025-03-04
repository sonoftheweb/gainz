#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up local development environment for editor support...${NC}"

# Function to set up a service
setup_service() {
  local service=$1
  echo -e "${BLUE}Setting up $service service...${NC}"
  echo -e "${YELLOW}Installing dependencies...${NC}"
  cd ./services/$service && npm install
  echo -e "${YELLOW}Generating Prisma client...${NC}"
  npx prisma generate

  # Ensure prisma.ts file exists in lib directory
  mkdir -p src/lib
  if [ ! -f src/lib/prisma.ts ]; then
    echo -e "${YELLOW}Creating prisma.ts file...${NC}"
    echo '// Direct import of Prisma client through Node.js import
import { PrismaClient } from "@prisma/client"

// Create a single instance of Prisma client to be used throughout the application
const prisma = new PrismaClient()

// Export the instance
export default prisma' > src/lib/prisma.ts
  fi

  echo -e "${GREEN}$service service setup complete.${NC}"
  cd ../..
}

# Set up each service
setup_service "authentication"
setup_service "authorization"
setup_service "user"

echo -e "${GREEN}All services set up successfully!${NC}"
echo -e "${BLUE}Notes:${NC}"
echo -e "1. If your editor still shows TypeScript errors, try restarting the TypeScript server."
echo -e "2. For VSCode: Cmd+Shift+P -> 'TypeScript: Restart TS server'"
echo -e "3. For JetBrains IDEs: File -> Invalidate Caches / Restart"
