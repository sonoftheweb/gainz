import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Middleware to extract user information from the X-User-Info header
 * This header is added by the gateway when a request has been authenticated
 */
export const extractUserInfo = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const userInfoHeader = req.header('X-User-Info');
  
  if (userInfoHeader) {
    try {
      // Decode the base64 encoded user info
      const userInfoJSON = Buffer.from(userInfoHeader, 'base64').toString();
      req.user = JSON.parse(userInfoJSON);
      
      logger.info('User info extracted from header', { 
        userId: req.user?.userId,
        path: req.path
      });
    } catch (error) {
      logger.error('Error parsing user info header', { error });
    }
  }
  
  next();
};
