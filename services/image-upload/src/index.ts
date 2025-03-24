import app from './app';
import dotenv from 'dotenv';
import logger from './utils/logger';
import s3Service from './services/s3Service';

// Ensure environment variables are loaded
dotenv.config();

// Get port from environment or use default
const PORT = process.env.PORT || 3004;

// Start the server
const server = app.listen(PORT, async () => {
  try {
    // Initialize S3 service and verify bucket exists
    await s3Service.checkConnection();
    
    logger.info(`🖼️ Image Upload Service running on port ${PORT}`);
    logger.info(`📚 API documentation available at http://localhost:${PORT}/api-docs`);
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
});

// Handle graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

// Listen for termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default server;
