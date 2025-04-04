import { Router } from 'express';
import { register, login, logout, refreshToken, forgotPassword, resetPassword, verifyEmail } from '../controllers/authController';

const router = Router();

// Authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

export default router;
