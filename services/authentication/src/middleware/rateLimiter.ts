import rateLimit, { Options } from 'express-rate-limit';
import logger from '../utils/logger';

/**
 * Rate limiting configurations for security-sensitive endpoints
 * Helps prevent brute force and DDoS attacks
 */

// Helper for logging rate limit hits
const logRateLimitHit = (req: any, res: any) => {
  logger.warn({
    message: 'Rate limit exceeded',
    ip: req.ip,
    path: req.path,
    method: req.method
  });
};

// General API rate limiter - less strict
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { status: 'error', message: 'Too many requests, please try again later' }
});

// Login endpoint rate limiter - more strict to prevent brute force
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many login attempts, please try again later' },
  // Using type assertion to fix TypeScript error with onLimitReached
  ...({
    onLimitReached: logRateLimitHit
  } as Partial<Options>)
});

// Password reset rate limiter - prevent abuse of password reset functionality
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many password reset attempts, please try again later' },
  // Using type assertion to fix TypeScript error with onLimitReached
  ...({
    onLimitReached: logRateLimitHit
  } as Partial<Options>)
});
