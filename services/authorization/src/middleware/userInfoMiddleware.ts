import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        [key: string]: any; // For any additional properties
      };
    }
  }
}

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
      const userInfo = JSON.parse(userInfoJSON);
      
      // Set user info in request object
      req.user = {
        id: userInfo.id || userInfo.userId, // Handle different property names
        email: userInfo.email
      };
      
      console.log('User info extracted from header', { 
        userId: req.user?.id,
        path: req.path
      });
    } catch (error) {
      console.error('Error parsing user info header', { error });
    }
  }
  
  next();
};
