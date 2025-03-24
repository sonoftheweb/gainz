import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import logger from '../utils/logger';

// Extend Express Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        [key: string]: any;
      };
    }
  }
}

// Middleware to verify JWT token and set user in request
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    
    // Use authorization service to validate token
    const authServiceUrl = process.env.AUTHORIZATION_SERVICE_URL || 'http://authorization:3002';
    
    try {
      // Call authorization service to validate token directly (service-to-service)
      // Note: When services communicate directly, they use the actual endpoint paths, not the gateway paths
      const response = await axios.post(`${authServiceUrl}/validate`, {
        token: token
      });
      
      // Set user information from response
      req.user = response.data.user;
      next();
    } catch (error) {
      // If authorization service rejects token
      logger.error('Token validation failed', { error });
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    logger.error('Authentication error', { error });
    return res.status(500).json({ message: 'Internal server error' });
  }
};
