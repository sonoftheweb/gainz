import { Request, Response, NextFunction } from 'express';
import { getAuthClient } from '../services/authorizationClient';

// Custom interface to extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Get authorization client
    const client = getAuthClient();

    // Call the authorization service to validate the token
    client.getUserByToken({ token }, (err: any, response: any) => {
      if (err || !response.success) {
        return res.status(401).json({ 
          message: 'Invalid or expired token',
          error: err ? err.message : response.error
        });
      }

      // Add user to request object
      req.user = {
        id: response.user.id,
        email: response.user.email
      };

      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
