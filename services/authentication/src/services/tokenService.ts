import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { UnauthorizedError, InternalServerError } from '../utils/errors';
import logger from '../utils/logger';

const prisma = new PrismaClient();
// Use the same JWT secret that the authorization service uses
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

// Ensure JWT_SECRET is available
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set. Using default value.');
}

interface TokenPayload {
  userId: string;
  [key: string]: any;
}

/**
 * Service for handling token generation, validation, and management
 * Supports versioning for better security
 */
class TokenService {
  /**
   * Generate a JWT access token
   */
  generateAccessToken(payload: TokenPayload, expiresIn: string = '15m'): string {
    try {
      const jwtSecret = JWT_SECRET as jwt.Secret;
      const options: jwt.SignOptions = { expiresIn: expiresIn as any };
      return jwt.sign(payload, jwtSecret, options);
    } catch (error) {
      logger.error('Failed to generate access token', { error });
      throw new InternalServerError('Failed to generate access token');
    }
  }
  
  /**
   * Generate a JWT refresh token and store it in the database
   */
  async generateRefreshToken(userId: string, expiresIn: string = '7d'): Promise<string> {
    try {
      // Get current token version
      const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, tokenVersion: true }
      });
      
      if (!user) {
        throw new UnauthorizedError('User not found');
      }
      
      // Include token version in payload for invalidation
      const payload = { 
        userId, 
        version: user.tokenVersion,
        type: 'refresh'
      };
      
      const jwtSecret = JWT_SECRET as jwt.Secret;
      const options: jwt.SignOptions = { expiresIn: expiresIn as any };
      const token = jwt.sign(payload, jwtSecret, options);
      
      // Calculate expiry date
      const expiryInMs = expiresIn.endsWith('d') 
        ? parseInt(expiresIn.replace('d', '')) * 24 * 60 * 60 * 1000 
        : parseInt(expiresIn.replace('m', '').replace('h', '')) * 60 * 1000;
      
      const expiresAt = new Date(Date.now() + expiryInMs);
      
      // Store token in database
      await prisma.token.create({
        data: {
          token,
          type: 'refresh',
          userId,
          expiresAt
        }
      });
      
      return token;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Failed to generate refresh token', { error, userId });
      throw new InternalServerError('Failed to generate refresh token');
    }
  }
  
  /**
   * Generate a password reset token
   */
  async generateResetToken(userId: string, expiresIn: string = '1h'): Promise<string> {
    try {
      const payload = { userId, type: 'reset' };
      
      const jwtSecret = JWT_SECRET as jwt.Secret;
      const options: jwt.SignOptions = { expiresIn: expiresIn as any };
      const token = jwt.sign(payload, jwtSecret, options);
      
      // Calculate expiry date
      const expiryInMs = expiresIn.endsWith('h') 
        ? parseInt(expiresIn.replace('h', '')) * 60 * 60 * 1000 
        : parseInt(expiresIn.replace('m', '').replace('d', '')) * 60 * 1000;
      
      const expiresAt = new Date(Date.now() + expiryInMs);
      
      // Store token in database
      await prisma.token.create({
        data: {
          token,
          type: 'reset',
          userId,
          expiresAt
        }
      });
      
      return token;
    } catch (error) {
      logger.error('Failed to generate reset token', { error, userId });
      throw new InternalServerError('Failed to generate reset token');
    }
  }
  
  /**
   * Verify a token and return the payload
   */
  verifyToken(token: string): TokenPayload {
    try {
      const jwtSecret = JWT_SECRET as jwt.Secret;
      return jwt.verify(token, jwtSecret) as TokenPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
  
  /**
   * Verify a refresh token is valid and in the database
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      // First verify JWT signature and expiry
      const payload = this.verifyToken(token) as TokenPayload & { version?: number };
      
      // Check that token is in database and not expired
      const tokenRecord = await prisma.token.findFirst({
        where: {
          token,
          type: 'refresh',
          expiresAt: { gt: new Date() }
        }
      });
      
      if (!tokenRecord) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      
      // Verify user and token version
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, tokenVersion: true }
      });
      
      if (!user || (payload.version !== undefined && user.tokenVersion !== payload.version)) {
        // Token version mismatch means tokens have been revoked
        await this.revokeToken(token);
        throw new UnauthorizedError('Token has been revoked');
      }
      
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Failed to verify refresh token', { error });
      throw new UnauthorizedError('Invalid refresh token');
    }
  }
  
  /**
   * Verify a reset token is valid and in the database
   */
  async verifyResetToken(token: string): Promise<TokenPayload> {
    try {
      // First verify JWT signature and expiry
      const payload = this.verifyToken(token);
      
      // Check that token is in database and not expired
      const tokenRecord = await prisma.token.findFirst({
        where: {
          token,
          type: 'reset',
          expiresAt: { gt: new Date() }
        }
      });
      
      if (!tokenRecord) {
        throw new UnauthorizedError('Invalid or expired reset token');
      }
      
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Failed to verify reset token', { error });
      throw new UnauthorizedError('Invalid or expired reset token');
    }
  }
  
  /**
   * Revoke a specific token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      await prisma.token.deleteMany({
        where: { token }
      });
    } catch (error) {
      logger.error('Failed to revoke token', { error });
      throw new InternalServerError('Failed to revoke token');
    }
  }
  
  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      // Delete all tokens
      await prisma.token.deleteMany({
        where: { userId, type: 'refresh' }
      });
      
      // Increment token version to invalidate any tokens still in the wild
      await prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } }
      });
    } catch (error) {
      logger.error('Failed to revoke all user tokens', { error, userId });
      throw new InternalServerError('Failed to revoke all user tokens');
    }
  }
  
  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      await prisma.token.deleteMany({
        where: { expiresAt: { lt: new Date() } }
      });
    } catch (error) {
      logger.error('Failed to clean up expired tokens', { error });
    }
  }
}

export default new TokenService();
