import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

// Validate token and return user information
export const validateToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Token is required' 
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
      
      // Find user by ID
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return res.status(404).json({ 
          valid: false, 
          error: 'User not found' 
        });
      }

      // Return user info (excluding sensitive data)
      const { refreshToken, ...userWithoutToken } = user;
      
      // Return standardized response format for the gateway
      res.status(200).json({
        valid: true,
        message: 'Token is valid',
        user: {
          ...userWithoutToken,
          // Ensure userId is provided (aliases id if needed)
          userId: userWithoutToken.id 
        }
      });
    } catch (error) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid or expired token' 
      });
    }
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Server error' 
    });
  }
};
// Test comment Mon Mar  3 00:25:32 AST 2025
// Test comment Mon Mar  3 10:40:39 PM AST 2025
// Test comment Sat Mar 15 10:26:16 PM ADT 2025
