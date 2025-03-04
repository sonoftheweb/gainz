# Gainz - Fitness Social Network

A social network for fitness enthusiasts built with a microservices architecture.

## Architecture

- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Service Communication**: REST for client-server, gRPC for service-to-service
- **Containerization**: Docker

## Services

- **Gateway**: Routes requests to appropriate services (Golang)
- **Authentication**: Handles login, registration, password recovery
- **Authorization**: Validates tokens, provides user information
- **User**: Manages user profiles and related data

## Development

### Requirements

- Docker and Docker Compose
- Node.js 16+
- Go 1.18+ (for gateway service)

### Setup

1. Clone the repository
2. Run `docker-compose up -d` to start all services in production mode

### Development Workflow

We've set up a streamlined development workflow with hot-reloading:

1. **Setup Local Editor Support**:
   ```bash
   ./setup-editor.sh
   ```
   This installs dependencies and generates Prisma client locally for better editor support.

2. **Start Development Mode**:
   ```bash
   ./dev.sh
   ```

2. **View Logs**:
   ```bash
   ./logs.sh
   # or for real-time logs
   ./logs.sh -f
   ```

3. **Restart a Specific Service**:
   ```bash
   ./restart-service.sh [service-name]
   ```

4. **Test Hot-Reloading**:
   ```bash
   ./test-dev-mode.sh
   ```

5. **Switch Back to Production**:
   ```bash
   ./prod.sh
   ```

For more details, see [DEVELOPMENT.md](DEVELOPMENT.md).
3. Access the API at http://localhost

## Project Structure

```
gainz/
├── docker-compose.yml
├── services/
│   ├── gateway/         # Golang service
│   ├── authentication/  # Node.js + TypeScript
│   ├── authorization/   # Node.js + TypeScript
│   └── user/            # Node.js + TypeScript
└── frontend/            # Flutter application (to be developed)
```
