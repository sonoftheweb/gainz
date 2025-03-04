# Development Workflow for Gainz

This document outlines the development workflow for the Gainz fitness social network application.

## Development Environment

We've set up a development environment with hot-reloading for all services, so you can make changes to your code and see them reflected immediately without having to rebuild containers.

### Starting Development Mode

To start development mode, simply run:

```bash
./dev.sh
```

This script will:
1. Stop any running containers
2. Start all services in development mode using Docker Compose
3. Show logs from all services

### Switching Back to Production Mode

To switch back to production mode, run:

```bash
./prod.sh
```

### Testing Development Mode

We've created a test script that helps verify that hot-reloading is working correctly across all services:

```bash
./test-dev-mode.sh
```

This script will:
1. Add a test comment to each service's code
2. Show the logs to verify that the services reloaded

Run this after setting up your development environment to ensure everything is working correctly.

### Viewing Logs

To view logs from all services in a color-coded format:

```bash
./logs.sh
```

To follow logs in real-time:

```bash
./logs.sh -f
```

This makes it easier to monitor the output from all services during development.

### Restarting Individual Services

If you need to restart a specific service without affecting others:

```bash
./restart-service.sh [service-name]
```

Where `[service-name]` is one of: gateway, authentication, authorization, user.

This is useful when a service gets into an inconsistent state or when you've made changes that weren't picked up by the hot-reloading mechanism.

## Development Features

### Editor Intellisense Setup

Even though we use Docker for development, your local editor needs the node_modules installed locally for TypeScript intellisense to work correctly:

```bash
# For each service, install dependencies locally
cd services/authentication && npm install && npx prisma generate
cd services/authorization && npm install && npx prisma generate
cd services/user && npm install && npx prisma generate
```

> **Important**: You must generate the Prisma client locally for TypeScript to recognize Prisma types in your editor.

### Prisma Client Pattern

We follow a singleton pattern for Prisma client instantiation. Always import the Prisma client from the service's lib directory:

```typescript
// DON'T do this
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// DO this instead
import prisma from '../lib/prisma';
```

This ensures we only have one Prisma connection per service and avoids connection pool issues.

If you experience TypeScript errors in your editor:

1. Make sure dependencies are installed locally as shown above
2. Restart your editor's TypeScript server:
   - VSCode: `Cmd+Shift+P` → `TypeScript: Restart TS server`
   - JetBrains: `File` → `Invalidate Caches / Restart`
3. If needed, install TypeScript globally: `npm install -g typescript`

### Docker Development Features

The development environment includes the following features:

### For TypeScript Services (Authentication, Authorization, User)

- **Volume Mounts**: Local code is mounted into the containers, so changes are immediately available.
- **Nodemon**: Services use Nodemon to automatically restart when files change.
- **Real-time TypeScript Compilation**: TypeScript files are compiled on-the-fly.
- **Preserved Node Modules**: Node modules are preserved in a Docker volume to avoid overwriting them with local node_modules.

### For Go Gateway Service

- **Air**: Uses [Air](https://github.com/cosmtrek/air) for hot reloading of Go code.
- **Volume Mounts**: Local code is mounted into the container.

## Making Changes

With this setup, you can:

1. Edit code files in your local environment
2. Save the changes
3. See the changes automatically reflected in the running services

No need to manually rebuild or restart containers unless you're:
- Adding new dependencies (packages)
- Changing Dockerfile configurations
- Modifying Docker Compose settings

## Common Tasks

### Adding a New NPM Package

If you need to add a new NPM package to a service:

```bash
# Stop the dev environment
docker-compose -f docker-compose.dev.yml down

# Add the package
cd services/[service-name]
npm install your-package --save

# Start the dev environment again
cd ../..
./dev.sh
```

### Prisma Schema Changes

After changing a Prisma schema:

```bash
# Access the container
docker exec -it gainz-[service-name] sh

# Run migrations
npx prisma migrate dev --name your_migration_name

# Exit the container
exit
```

## Troubleshooting

### Container Not Reflecting Changes

If a container isn't reflecting your changes:

```bash
# Restart just that service
docker-compose -f docker-compose.dev.yml restart [service-name]
```

### Proto File Issues

If you make changes to proto files, you may need to:

```bash
# Stop the dev environment
docker-compose -f docker-compose.dev.yml down

# Start it again to rebuild with new proto files
./dev.sh
```
