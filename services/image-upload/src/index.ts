import app from './app';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import logger from './utils/logger';

// Ensure environment variables are loaded
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient();

// Get port from environment or use default
const PORT = process.env.PORT || 3004;

// Start the server
const server = app.listen(PORT, async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info(`💾 Database connection successful`);
    
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
  
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  });
};

// Listen for termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default server;
