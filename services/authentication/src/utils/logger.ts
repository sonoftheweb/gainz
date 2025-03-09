import winston from 'winston';

/**
 * Structured logger for the authentication service
 * Handles different log levels and formats based on environment
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'authentication-service' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      dirname: process.env.LOG_DIR || 'logs' 
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      dirname: process.env.LOG_DIR || 'logs'
    })
  ]
});

// If we're not in production, also log to the console with colorized output
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create a stream object with a write function that will be used by morgan
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

export default logger;
