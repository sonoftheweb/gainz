import { initializeGrpcServer } from './services/grpcServer';
import app from './app';
import logger from './utils/logger';

// Get port from environment variables
const port = process.env.PORT || 3001;

// Start the REST server
app.listen(port, () => {
  logger.info(`Authentication service REST server running on port ${port}`);
});

// Start the gRPC server
initializeGrpcServer();
