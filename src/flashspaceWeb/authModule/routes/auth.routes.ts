import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// ==========================================
// PUBLIC ROUTES (No Auth Required)
// ==========================================

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);

router.get('/verify-email', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);

router.post('/google', authController.googleAuth);
router.post('/google/callback', authController.googleCallback);

router.get('/check-auth', AuthMiddleware.optionalAuth, authController.checkAuth);

// ==========================================
// PROTECTED ROUTES (Auth Required)
// ==========================================

// Apply authentication middleware to all routes defined BELOW this line
router.use(AuthMiddleware.authenticate);

router.post('/change-password', authController.changePassword);
router.post('/logout', authController.logout);
router.post('/logout-all', authController.logoutAll);

router.get('/profile', AuthMiddleware.requireVerifiedEmail, authController.getProfile);

export { router as authRoutes };