import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { authRateLimiter, strictAuthRateLimiter } from '../../../config/rateLimiter.config';

const router = Router();
const authController = new AuthController();

// Public routes (no authentication required)
router.post('/signup', 
  strictAuthRateLimiter,
  authController.signup
);

router.post('/login', 
  strictAuthRateLimiter,
  authController.login
);

// OTP-based verification
router.post('/verify-otp',
  authRateLimiter,
  authController.verifyOTP
);

router.post('/resend-otp',
  authRateLimiter,
  authController.resendOTP
);

// Legacy token-based verification (keep for backward compatibility)
router.get('/verify-email', authController.verifyEmail);

router.post('/forgot-password', 
  authRateLimiter,
  authController.forgotPassword
);

router.post('/reset-password', 
  authRateLimiter,
  authController.resetPassword
);

router.post('/refresh-token', authController.refreshToken);

// Google OAuth routes
router.post('/google', authController.googleAuth);
router.post('/google/callback', authController.googleCallback);

// Semi-protected routes (optional authentication)
router.get('/check-auth', 
  AuthMiddleware.optionalAuth, 
  authController.checkAuth
);

// Protected routes (authentication required)
router.use(AuthMiddleware.authenticate); // Apply to all routes below

router.post('/change-password', authController.changePassword);
router.post('/logout', authController.logout);
router.post('/logout-all', authController.logoutAll);

// Profile routes (requires email verification)
router.get('/profile', 
  AuthMiddleware.requireVerifiedEmail, 
  authController.getProfile
);

export { router as authRoutes };