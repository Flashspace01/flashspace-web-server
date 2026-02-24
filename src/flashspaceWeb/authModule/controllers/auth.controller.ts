import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthMiddleware } from '../middleware/auth.middleware';
import {
  SignupRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest
} from '../types/auth.types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Register new user
  signup = async (req: Request, res: Response): Promise<void> => {
    try {
      const signupData: SignupRequest = req.body;
      console.log('Signup Request Body:', JSON.stringify(signupData, null, 2)); // DEBUG LOG

      // Basic validation
      if (!signupData.email || !signupData.password || !signupData.fullName) {
        res.status(400).json({
          success: false,
          message: 'Email, password, and full name are required',
          data: {},
          error: 'Missing required fields'
        });
        return;
      }

      const result = await this.authService.signup(signupData);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: result.user,
          error: {}
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message
        });
      }
    } catch (error) {
      console.error('Signup controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Login user
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const loginData: LoginRequest = req.body;

      // Basic validation
      if (!loginData.email || !loginData.password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
          data: {},
          error: 'Missing required fields'
        });
        return;
      }

      const result = await this.authService.login(loginData);

      if (result.success && result.tokens) {
        // Set secure cookies
        AuthMiddleware.setTokenCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: result.user,
            tokens: result.tokens
          },
          error: {}
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message
        });
      }
    } catch (error) {
      console.error('Login controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Verify email
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Verification token is required',
          data: {},
          error: 'Missing verification token'
        });
        return;
      }

      const result = await this.authService.verifyEmail(token);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.user,
          error: {}
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message
        });
      }
    } catch (error) {
      console.error('Email verification controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Forgot password
  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const forgotPasswordData: ForgotPasswordRequest = req.body;

      if (!forgotPasswordData.email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          data: {},
          error: 'Missing email'
        });
        return;
      }

      const result = await this.authService.forgotPassword(forgotPasswordData);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {},
        error: {}
      });
    } catch (error) {
      console.error('Forgot password controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Reset password
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const resetPasswordData: ResetPasswordRequest = req.body;

      if (!resetPasswordData.token || !resetPasswordData.password || !resetPasswordData.confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'Token, password, and confirmPassword are required',
          data: {},
          error: 'Missing required fields'
        });
        return;
      }

      const result = await this.authService.resetPassword(resetPasswordData);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {},
          error: {}
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message
        });
      }
    } catch (error) {
      console.error('Reset password controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Change password (authenticated user)
  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          data: {},
          error: 'Not authenticated'
        });
        return;
      }

      const changePasswordData: ChangePasswordRequest = req.body;

      if (!changePasswordData.currentPassword || !changePasswordData.newPassword || !changePasswordData.confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password, new password, and confirm password are required',
          data: {},
          error: 'Missing required fields'
        });
        return;
      }

      const result = await this.authService.changePassword(req.user.id, changePasswordData);

      if (result.success) {
        // Clear cookies to force re-login with new password
        AuthMiddleware.clearTokenCookies(res);

        res.status(200).json({
          success: true,
          message: result.message,
          data: {},
          error: {}
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message
        });
      }
    } catch (error) {
      console.error('Change password controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Refresh access token
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const refreshToken = AuthMiddleware.extractRefreshToken(req);

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token required',
          data: {},
          error: 'Missing refresh token'
        });
        return;
      }

      const result = await this.authService.refreshToken(refreshToken);

      if (result.success && result.tokens) {
        // Set new cookies
        AuthMiddleware.setTokenCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

        res.status(200).json({
          success: true,
          message: result.message,
          data: {},
          error: {}
        });
      } else {
        AuthMiddleware.clearTokenCookies(res);
        res.status(401).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message
        });
      }
    } catch (error) {
      console.error('Refresh token controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Logout user
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          data: {},
          error: 'Not authenticated'
        });
        return;
      }

      const refreshToken = AuthMiddleware.extractRefreshToken(req);

      if (refreshToken) {
        await this.authService.logout(req.user.id, refreshToken);
      }

      AuthMiddleware.clearTokenCookies(res);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        data: {},
        error: {}
      });
    } catch (error) {
      console.error('Logout controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Logout from all devices
  logoutAll = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          data: {},
          error: 'Not authenticated'
        });
        return;
      }

      await this.authService.logoutAll(req.user.id);
      AuthMiddleware.clearTokenCookies(res);

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices successfully',
        data: {},
        error: {}
      });
    } catch (error) {
      console.error('Logout all controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Get current user profile
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          data: {},
          error: 'Not authenticated'
        });
        return;
      }

      const user = await this.authService.getUserProfile(req.user.id);

      if (user) {
        res.status(200).json({
          success: true,
          message: 'Profile retrieved successfully',
          data: {
            id: user._id.toString(),
            email: user.email,
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            profilePicture: user.profilePicture,
            role: user.role,
            authProvider: user.authProvider,
            isEmailVerified: user.isEmailVerified,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          },
          error: {}
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'User not found',
          data: {},
          error: 'User not found'
        });
      }
    } catch (error) {
      console.error('Get profile controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Check authentication status
  checkAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.user) {
        // Fetch full user details
        const user = await this.authService.getUserProfile(req.user.id);

        if (user) {
          res.status(200).json({
            success: true,
            message: 'User is authenticated',
            data: {
              isAuthenticated: true,
              user: {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                profilePicture: user.profilePicture,
                role: user.role,
                authProvider: user.authProvider,
                isEmailVerified: user.isEmailVerified,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
              }
            },
            error: {}
          });
        } else {
          res.status(200).json({
            success: true,
            message: 'User is not authenticated',
            data: {
              isAuthenticated: false
            },
            error: {}
          });
        }
      } else {
        res.status(200).json({
          success: true,
          message: 'User is not authenticated',
          data: {
            isAuthenticated: false
          },
          error: {}
        });
      }
    } catch (error) {
      console.error('Check auth controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Verify email with OTP
  verifyOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, otp } = req.body;

      // Validation
      if (!email || !otp) {
        res.status(400).json({
          success: false,
          message: 'Email and OTP are required',
          data: {},
          error: 'Missing required fields'
        });
        return;
      }

      // Validate OTP format (6 digits)
      if (!/^\d{6}$/.test(otp)) {
        res.status(400).json({
          success: false,
          message: 'Invalid OTP format. Please enter a 6-digit code.',
          data: {},
          error: 'Invalid OTP format'
        });
        return;
      }

      const result = await this.authService.verifyEmailOTP({ email, otp });

      if (result.success && result.tokens) {
        // Set secure cookies
        AuthMiddleware.setTokenCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: result.user
          },
          error: {}
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message
        });
      }
    } catch (error) {
      console.error('Verify OTP controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Resend OTP
  resendOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      // Validation
      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          data: {},
          error: 'Missing required field'
        });
        return;
      }

      const result = await this.authService.resendVerificationOTP({ email });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {},
          error: {}
        });
      } else {
        const statusCode = result.retryAfter ? 429 : 400;
        res.status(statusCode).json({
          success: false,
          message: result.message,
          data: result.retryAfter ? { retryAfter: result.retryAfter } : {},
          error: result.message
        });
      }
    } catch (error) {
      console.error('Resend OTP controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Google OAuth - Verify ID token from frontend
  googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      const { idToken, role } = req.body;

      if (!idToken) {
        res.status(400).json({
          success: false,
          message: 'Google ID token is required',
          data: {},
          error: 'Missing ID token'
        });
        return;
      }

      // Verify token with Google and authenticate user
      console.log('Google Auth with Role:', role);
      const result = await this.authService.googleAuthWithToken(idToken, role);

      if (result.success && result.tokens) {
        // Set secure cookies
        AuthMiddleware.setTokenCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: result.user
          },
          error: {}
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message
        });
      }
    } catch (error) {
      console.error('Google auth controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };

  // Google OAuth callback (alternative method for server-side flow)
  googleCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { idToken, role } = req.body;
      console.log('Google Callback Request Body:', JSON.stringify(req.body, null, 2));

      if (!idToken) {
        res.status(400).json({
          success: false,
          message: 'Google ID token is required',
          data: {},
          error: 'Missing ID token'
        });
        return;
      }

      console.log('Google Callback - Processing role:', role);
      const result = await this.authService.googleAuthWithToken(idToken, role);

      if (result.success && result.tokens) {
        AuthMiddleware.setTokenCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: result.user
          },
          error: {}
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message
        });
      }
    } catch (error) {
      console.error('Google callback controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {},
        error: 'Internal server error'
      });
    }
  };
}