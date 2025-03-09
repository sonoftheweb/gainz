import { body } from 'express-validator';

/**
 * Validators for authentication routes
 * These enforce proper input formats and help prevent security issues
 */

export const registerValidator = [
  body('email')
    .isEmail().withMessage('Must provide a valid email address')
    .normalizeEmail()
    .trim(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character')
];

export const loginValidator = [
  body('email')
    .isEmail().withMessage('Must provide a valid email address')
    .normalizeEmail()
    .trim(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

export const forgotPasswordValidator = [
  body('email')
    .isEmail().withMessage('Must provide a valid email address')
    .normalizeEmail()
    .trim()
];

export const resetPasswordValidator = [
  body('token')
    .notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character')
];

export const refreshTokenValidator = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
];

export const logoutValidator = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
];
