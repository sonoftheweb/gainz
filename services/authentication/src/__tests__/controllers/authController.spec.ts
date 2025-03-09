import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

// Mock dependencies
jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('mock-salt'),
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../services/emailService', () => emailServiceMock);

// Make sure these mocks are imported before importing the controller
import { prismaMock } from '../mocks/prismaMock';
import tokenServiceMock from '../mocks/tokenServiceMock';
import emailServiceMock from '../mocks/emailServiceMock';

// Import the controller after mocks are imported
import { register, verifyEmail } from '../../controllers/authController';



describe('Authentication Controller', () => {
  describe('register', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;

    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
      
      // Setup request and response mocks
      jsonMock = jest.fn();
      mockRequest = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          confirm_password: 'Password123!'
        }
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jsonMock
      };
    });

    it('should register a new user successfully', async () => {
      // Setup mock for Prisma findUnique (user doesn't exist)
      prismaMock.user.findUnique.mockResolvedValue(null);
      
      // Setup mock for Prisma create (create user)
      prismaMock.user.create.mockResolvedValue({
        id: 'mock-user-id',
        isEmailVerified: false,
        emailVerificationCode: '123456',
        emailVerificationExpiry: new Date(Date.now() + 10 * 60 * 1000),
        email: 'test@example.com',
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        tokenVersion: 0
      } as any); // Type cast to bypass strict type checking in tests

      // Call the register function
      await register(mockRequest as Request, mockResponse as Response);

      // Verify Prisma was called correctly
      expect(prismaMock.user.findUnique).toHaveBeenCalled();
      expect(prismaMock.user.create).toHaveBeenCalled();

      // Verify bcrypt was called to hash the password
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 'mock-salt');

      // Verify token service was called to generate tokens
      expect(tokenServiceMock.generateAccessToken).toHaveBeenCalled();
      expect(tokenServiceMock.generateRefreshToken).toHaveBeenCalled();

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'User registered successfully',
        token: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      });
    });

    it('should return 400 if user already exists', async () => {
      // Setup mock for Prisma findUnique (user exists)
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'existing-user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        tokenVersion: 0
      } as any); // Type cast to bypass strict type checking in tests

      // Call the register function
      await register(mockRequest as Request, mockResponse as Response);

      // Verify Prisma findUnique was called
      expect(prismaMock.user.findUnique).toHaveBeenCalled();
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'User already exists' });
      
      // Verify create was not called
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should handle server errors during registration', async () => {
      // Setup mock for Prisma findUnique (user doesn't exist)
      prismaMock.user.findUnique.mockResolvedValue(null);
      
      // Setup mock for Prisma create (throws error)
      prismaMock.user.create.mockRejectedValue(new Error('Database error'));

      // Call the register function
      await register(mockRequest as Request, mockResponse as Response);

      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Server error' });
    });

    it('should validate required fields for registration', async () => {
      // Missing email
      mockRequest.body = { password: 'Password123!', confirm_password: 'Password123!' };
      
      await register(mockRequest as Request, mockResponse as Response);
      
      // Should return 400 with proper error message
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Email, password, and password confirmation are required' });
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Missing password
      mockRequest.body = { email: 'test@example.com', confirm_password: 'Password123!' };
      
      await register(mockRequest as Request, mockResponse as Response);
      
      // Should return 400 with proper error message
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Email, password, and password confirmation are required' });
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Missing confirm_password
      mockRequest.body = { email: 'test@example.com', password: 'Password123!' };
      
      await register(mockRequest as Request, mockResponse as Response);
      
      // Should return 400 with proper error message
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Email, password, and password confirmation are required' });
    });
    
    it('should validate password match', async () => {
      // Passwords don't match
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123!',
        confirm_password: 'DifferentPassword123!'
      };
      
      await register(mockRequest as Request, mockResponse as Response);
      
      // Should return 400 with proper error message
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Passwords do not match' });
      
      // Ensure user is not created
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;

    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
      
      // Setup request and response mocks
      jsonMock = jest.fn();
      mockRequest = {
        body: {
          email: 'test@example.com',
          otp: '123456'
        }
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jsonMock
      };
    });

    it('should verify email successfully', async () => {
      // Mock user retrieval with unverified email
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'mock-user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        isEmailVerified: false,
        emailVerificationCode: '123456',
        emailVerificationExpiry: new Date(Date.now() + 10 * 60 * 1000), // future date
        tokenVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpiry: null
      });

      // Mock user update
      prismaMock.user.update.mockResolvedValue({
        id: 'mock-user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
        tokenVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpiry: null
      });

      // Call the controller
      await verifyEmail(mockRequest as Request, mockResponse as Response);

      // Verify the user was updated correctly
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'mock-user-id' },
        data: {
          isEmailVerified: true,
          emailVerificationCode: null,
          emailVerificationExpiry: null
        }
      });

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Email verified successfully'
      });
    });

    it('should return error for invalid or expired OTP', async () => {
      // Mock user retrieval with invalid OTP
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'mock-user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        isEmailVerified: false,
        emailVerificationCode: '654321', // Different OTP than what's passed
        emailVerificationExpiry: new Date(Date.now() + 10 * 60 * 1000),
        tokenVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpiry: null
      });

      // Call the controller
      await verifyEmail(mockRequest as Request, mockResponse as Response);

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Invalid or expired verification code'
      });
    });

    it('should return error for already verified email', async () => {
      // Mock user retrieval with already verified email
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'mock-user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        isEmailVerified: true, // Already verified
        emailVerificationCode: null,
        emailVerificationExpiry: null,
        tokenVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        refreshToken: null,
        resetPasswordToken: null,
        resetPasswordExpiry: null
      });

      // Call the controller
      await verifyEmail(mockRequest as Request, mockResponse as Response);

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Email is already verified'
      });
    });

    it('should validate required fields for verification', async () => {
      // Missing email
      mockRequest.body = { otp: '123456' };
      await verifyEmail(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Email and verification code are required'
      });

      // Missing OTP
      mockRequest.body = { email: 'test@example.com' };
      await verifyEmail(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Email and verification code are required'
      });
    });
  });
});
