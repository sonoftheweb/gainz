import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
// Only need jwt for verification, not signing
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import tokenService from '../services/tokenService';
import emailService from '../services/emailService';
import logger from '../utils/logger';
import { 
  BadRequestError, 
  UnauthorizedError, 
  NotFoundError, 
  ConflictError, 
  InternalServerError 
} from '../utils/errors';

// Middleware to handle controller errors
const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Creates a new user account with the provided email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password (min 8 characters)
 *             example:
 *               email: "user@example.com"
 *               password: "Password123!"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Bad request - User already exists or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User already exists
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Server error
 */
// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword
      }
    });

    // Generate JWT access token using token service
    const token = tokenService.generateAccessToken({ userId: user.id });

    // Generate refresh token using token service (already stores in DB)
    const refreshToken = await tokenService.generateRefreshToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT access token using token service
    const token = tokenService.generateAccessToken({ userId: user.id });

    // Generate refresh token using token service (already stores in DB)
    const refreshToken = await tokenService.generateRefreshToken(user.id);

    res.status(200).json({
      message: 'Login successful',
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout user
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Find user by refresh token
    const user = await prisma.user.findFirst({
      where: { refreshToken }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    // Remove refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: null }
    });

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Find user by refresh token
    const user = await prisma.user.findFirst({
      where: { refreshToken }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    try {
      // Verify refresh token
      jwt.verify(refreshToken, process.env.JWT_SECRET as string);
    } catch (error) {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }

    // Generate new access token using token service
    const newToken = tokenService.generateAccessToken({ userId: user.id });

    res.status(200).json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token using token service
    const resetToken = tokenService.generateAccessToken({ userId: user.id }, '1h');

    // Calculate expiry time (1 hour from now)
    const resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiry
      }
    });

    // Send password reset email
    try {
      // Use the emailService to send password reset email
      await emailService.sendPasswordResetEmail(
        email,
        user.email, // Using email as username since we don't have a username field
        resetToken
      );
      res.status(200).json({
        message: 'Password reset email sent'
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      res.status(500).json({ message: 'Error sending email' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    // Find user by reset token and check if it's valid
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: {
          gt: new Date() // Token not expired
        }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null
      }
    });

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Test comment Mon Mar  3 00:25:30 AST 2025
// Test comment Mon Mar  3 10:40:37 PM AST 2025
