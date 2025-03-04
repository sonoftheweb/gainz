import { Request, Response } from 'express';

// Added this comment to test hot reloading
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';

// Helper function for signing JWT tokens
const signToken = (payload: object, expiresIn: string | number = '24h'): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  // Using a type assertion to avoid TypeScript errors with expiresIn
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

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

    // Generate JWT token
    const token = signToken(
      { userId: user.id }, 
      process.env.JWT_EXPIRES_IN || '24h'
    );

    // Generate refresh token
    const refreshToken = signToken(
      { userId: user.id }, 
      process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    );

    // Save refresh token to database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

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

    // Generate JWT token
    const token = signToken(
      { userId: user.id }, 
      process.env.JWT_EXPIRES_IN || '24h'
    );

    // Generate refresh token
    const refreshToken = signToken(
      { userId: user.id }, 
      process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    );

    // Save refresh token to database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

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

    // Generate new access token
    const newToken = signToken(
      { userId: user.id }, 
      process.env.JWT_EXPIRES_IN || '24h'
    );

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

    // Generate reset token
    const resetToken = signToken(
      { userId: user.id }, 
      '1h'
    );

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

    // In a real application, you would send an email with the reset link
    // For now, we'll just return the token in the response for testing purposes
    res.status(200).json({
      message: 'Password reset token generated',
      resetToken
    });
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
