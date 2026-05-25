import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { AuthMiddleware } from "../middleware/auth.middleware";
import {
  SignupRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from "../types/auth.types";

import { z } from "zod";

const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

const SignupSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: PasswordSchema,
  confirmPassword: z.string(),
  fullName: z.string().min(2, "Full name is too short").trim(),
  phoneNumber: z.string().optional(),
  role: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const LoginSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: PasswordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: PasswordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Register new user
  signup = async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = SignupSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.format(),
        });
        return;
      }

      const signupData: SignupRequest = validation.data as any;

      const result = await this.authService.signup(signupData);

      if (result.success && result.tokens) {
        // Set auth cookies so user is logged in immediately after signup
        AuthMiddleware.setTokenCookies(
          res,
          result.tokens.accessToken,
          result.tokens.refreshToken,
        );

        res.status(201).json({
          success: true,
          message: result.message,
          data: {
            user: result.user,
            tokens: result.tokens,
          },
          error: {},
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Signup controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  // Login user
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = LoginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.format(),
        });
        return;
      }

      const loginData: LoginRequest = {
        ...validation.data,
        trustedDeviceToken: req.cookies?.twoFactorDevice,
      };

      const result = await this.authService.login(loginData);

      if (result.success && result.requiresTwoFactor) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            requiresTwoFactor: true,
            email: loginData.email,
            devOtp: result.devOtp,
          },
          error: {},
        });
      } else if (result.success && result.tokens) {
        // Set secure cookies
        AuthMiddleware.setTokenCookies(
          res,
          result.tokens.accessToken,
          result.tokens.refreshToken,
        );

        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: result.user,
            tokens: result.tokens,
          },
          error: {},
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Login controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  verifyLoginOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        res.status(400).json({
          success: false,
          message: "Email and OTP are required",
          data: {},
          error: "Missing required fields",
        });
        return;
      }

      if (!/^\d{6}$/.test(otp)) {
        res.status(400).json({
          success: false,
          message: "Invalid OTP format. Please enter a 6-digit code.",
          data: {},
          error: "Invalid OTP format",
        });
        return;
      }

      const result = await this.authService.verifyLoginOTP({ email, otp });

      if (result.success && result.tokens) {
        AuthMiddleware.setTokenCookies(
          res,
          result.tokens.accessToken,
          result.tokens.refreshToken,
        );

        if (result.twoFactorToken) {
          AuthMiddleware.setTwoFactorDeviceCookie(res, result.twoFactorToken);
        }

        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: result.user,
            tokens: result.tokens,
          },
          error: {},
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Verify login OTP controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  // Verify email
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        res.status(400).json({
          success: false,
          message: "Verification token is required",
          data: {},
          error: "Missing verification token",
        });
        return;
      }

      const result = await this.authService.verifyEmail(token);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.user,
          error: {},
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Email verification controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  // Forgot password
  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const forgotPasswordData: ForgotPasswordRequest = req.body;
      const frontendUrl =
        req.get("origin") ||
        req.get("referer")?.replace(/\/forgot-password\/?$/, "") ||
        req.get("x-forwarded-origin") ||
        undefined;
      const maskValue = (value?: string) => {
        if (!value) return "<not set>";
        if (value.length <= 8) return `${value.slice(0, 2)}***`;
        return `${value.slice(0, 4)}***${value.slice(-4)}`;
      };

      console.log("[ForgotPassword] Incoming request debug:", {
        email: forgotPasswordData.email,
        frontendUrl: frontendUrl || "<not detected>",
        env: {
          NODE_ENV: process.env.NODE_ENV || "<not set>",
          FRONTEND_URL: process.env.FRONTEND_URL || "<not set>",
          EMAIL_SERVICE: process.env.EMAIL_SERVICE || "<auto>",
          EMAIL_FROM: process.env.EMAIL_FROM || "<not set>",
          SMTP_HOST: process.env.SMTP_HOST || "<not set>",
          SMTP_PORT: process.env.SMTP_PORT || "<not set>",
          SMTP_USER: maskValue(process.env.SMTP_USER),
          EMAIL_USER: maskValue(process.env.EMAIL_USER),
        },
      });

      if (!forgotPasswordData.email) {
        res.status(400).json({
          success: false,
          message: "Email is required",
          data: {},
          error: "Missing email",
        });
        return;
      }

      const result = await this.authService.forgotPassword(
        forgotPasswordData,
        frontendUrl,
      );

      res.status(result.success ? 200 : 500).json({
        success: result.success,
        message: result.message,
        data: {},
        error: result.success ? {} : result.message,
      });
    } catch (error) {
      console.error("Forgot password controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  // Reset password
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = ResetPasswordSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.format(),
        });
        return;
      }

      const resetPasswordData: ResetPasswordRequest = validation.data as any;

      const result = await this.authService.resetPassword(resetPasswordData);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {},
          error: {},
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Reset password controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  // Change password (authenticated user)
  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          data: {},
          error: "Not authenticated",
        });
        return;
      }

      const validation = ChangePasswordSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.error.format(),
        });
        return;
      }

      const changePasswordData: ChangePasswordRequest = validation.data as any;

      const result = await this.authService.changePassword(
        req.user.id,
        changePasswordData,
        AuthMiddleware.extractRefreshToken(req) || undefined,
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {},
          error: {},
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Change password controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
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
          message: "Refresh token required",
          data: {},
          error: "Missing refresh token",
        });
        return;
      }

      const result = await this.authService.refreshToken(refreshToken);

      if (result.success && result.tokens) {
        // Set new cookies
        AuthMiddleware.setTokenCookies(
          res,
          result.tokens.accessToken,
          result.tokens.refreshToken,
        );

        res.status(200).json({
          success: true,
          message: result.message,
          data: {},
          error: {},
        });
      } else {
        AuthMiddleware.clearTokenCookies(res);
        res.status(401).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Refresh token controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  // Logout user
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          data: {},
          error: "Not authenticated",
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
        message: "Logged out successfully",
        data: {},
        error: {},
      });
    } catch (error) {
      console.error("Logout controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  // Logout from all devices
  logoutAll = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          data: {},
          error: "Not authenticated",
        });
        return;
      }

      await this.authService.logoutAll(req.user.id);
      AuthMiddleware.clearTokenCookies(res);

      res.status(200).json({
        success: true,
        message: "Logged out from all devices successfully",
        data: {},
        error: {},
      });
    } catch (error) {
      console.error("Logout all controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  // Get current user profile
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          data: {},
          error: "Not authenticated",
        });
        return;
      }

      const user = await this.authService.getUserProfile(req.user.id);

      if (user) {
        res.status(200).json({
          success: true,
          message: "Profile retrieved successfully",
          data: {
            id: user._id.toString(),
            email: user.email,
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            alternatePhone: user.alternatePhone,
            address: user.address,
            city: user.city,
            state: user.state,
            country: user.country,
            pincode: user.pincode,
            profilePicture: user.profilePicture,
            coverImage: user.coverImage,
            role: user.role,
            authProvider: user.authProvider,
            isEmailVerified: user.isEmailVerified,
            kycVerified: user.kycVerified,
            isTwoFactorEnabled: user.isTwoFactorEnabled,
            preferences: user.preferences,
            notifications: user.notifications,
            securityPreferences: user.securityPreferences,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          error: {},
        });
      } else {
        res.status(404).json({
          success: false,
          message: "User not found",
          data: {},
          error: "User not found",
        });
      }
    } catch (error) {
      console.error("Get profile controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
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
            message: "User is authenticated",
            data: {
              isAuthenticated: true,
              user: {
                id: user._id.toString(),
                email: user.email,
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                alternatePhone: user.alternatePhone,
                address: user.address,
                city: user.city,
                state: user.state,
                country: user.country,
                pincode: user.pincode,
                profilePicture: user.profilePicture,
                coverImage: user.coverImage,
                role: user.role,
                authProvider: user.authProvider,
                isEmailVerified: user.isEmailVerified,
                kycVerified: user.kycVerified,
                isTwoFactorEnabled: user.isTwoFactorEnabled,
                preferences: user.preferences,
                notifications: user.notifications,
                securityPreferences: user.securityPreferences,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
              },
            },
            error: {},
          });
        } else {
          res.status(200).json({
            success: true,
            message: "User is not authenticated",
            data: {
              isAuthenticated: false,
            },
            error: {},
          });
        }
      } else {
        res.status(200).json({
          success: true,
          message: "User is not authenticated",
          data: {
            isAuthenticated: false,
          },
          error: {},
        });
      }
    } catch (error) {
      console.error("Check auth controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
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
          message: "Email and OTP are required",
          data: {},
          error: "Missing required fields",
        });
        return;
      }

      // Validate OTP format (6 digits)
      if (!/^\d{6}$/.test(otp)) {
        res.status(400).json({
          success: false,
          message: "Invalid OTP format. Please enter a 6-digit code.",
          data: {},
          error: "Invalid OTP format",
        });
        return;
      }

      const result = await this.authService.verifyEmailOTP({ email, otp });

      if (result.success && result.tokens) {
        // Set secure cookies
        AuthMiddleware.setTokenCookies(
          res,
          result.tokens.accessToken,
          result.tokens.refreshToken,
        );

        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: result.user,
          },
          error: {},
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Verify OTP controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
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
          message: "Email is required",
          data: {},
          error: "Missing required field",
        });
        return;
      }

      const result = await this.authService.resendVerificationOTP({ email });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {},
          error: {},
        });
      } else {
        const statusCode = result.retryAfter ? 429 : 400;
        res.status(statusCode).json({
          success: false,
          message: result.message,
          data: result.retryAfter ? { retryAfter: result.retryAfter } : {},
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Resend OTP controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
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
          message: "Google ID token is required",
          data: {},
          error: "Missing ID token",
        });
        return;
      }

      // Verify token with Google and authenticate user
      console.log('Google Auth with Role:', role);
      const result = await this.authService.googleAuthWithToken(
        idToken,
        role,
      );

      if (result.success && result.requiresTwoFactor) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            requiresTwoFactor: true,
            email: result.user?.email,
            devOtp: result.devOtp,
          },
          error: {},
        });
      } else if (result.success && result.tokens) {
        // Set secure cookies
        AuthMiddleware.setTokenCookies(
          res,
          result.tokens.accessToken,
          result.tokens.refreshToken,
        );

        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: result.user,
          },
          error: {},
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Google auth controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
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
          message: "Google ID token is required",
          data: {},
          error: "Missing ID token",
        });
        return;
      }

      console.log('Google Callback - Processing role:', role);
      const result = await this.authService.googleAuthWithToken(
        idToken,
        role,
      );

      if (result.success && result.requiresTwoFactor) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            requiresTwoFactor: true,
            email: result.user?.email,
            devOtp: result.devOtp,
          },
          error: {},
        });
      } else if (result.success && result.tokens) {
        AuthMiddleware.setTokenCookies(
          res,
          result.tokens.accessToken,
          result.tokens.refreshToken,
        );

        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            user: result.user,
          },
          error: {},
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Google callback controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  // Update user profile settings (authenticated user)
  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          data: {},
          error: "Not authenticated",
        });
        return;
      }

      const updates = req.body;

      // Prevent updating sensitive fields directly
      delete updates.password;
      delete updates.email;
      delete updates.role;
      delete updates.authProvider;
      delete updates.kycVerified;
      delete updates.isEmailVerified;
      const shouldClearTrustedTwoFactorDevices = updates.isTwoFactorEnabled === false;
      delete updates.trustedTwoFactorDevices;
      delete updates.twoFactorSecret;

      if (shouldClearTrustedTwoFactorDevices) {
        updates.trustedTwoFactorDevices = [];
      }

      // Import UserModel locally to break any circular dependencies in the controller layer
      const { UserModel } = await import("../models/user.model");

      // Flatten the updates to support atomic partial nested updates (e.g. "preferences.darkMode")
      // We'll let mongoose handle the straightforward patching
      const updatedUser = await UserModel.findByIdAndUpdate(
        req.user.id,
        { $set: updates },
        { new: true, runValidators: true },
      );

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: "User not found",
          data: {},
          error: "User not found",
        });
        return;
      }

      res.status(200).json({
          success: true,
          message: "Profile updated successfully",
          data: {
            id: updatedUser._id.toString(),
            _id: updatedUser._id.toString(),
            email: updatedUser.email,
          fullName: updatedUser.fullName,
          phoneNumber: updatedUser.phoneNumber,
          alternatePhone: updatedUser.alternatePhone,
          address: updatedUser.address,
          city: updatedUser.city,
          state: updatedUser.state,
          country: updatedUser.country,
          pincode: updatedUser.pincode,
          profilePicture: updatedUser.profilePicture,
          coverImage: updatedUser.coverImage,
          role: updatedUser.role,
          authProvider: updatedUser.authProvider,
          isEmailVerified: updatedUser.isEmailVerified,
          kycVerified: updatedUser.kycVerified,
          isTwoFactorEnabled: updatedUser.isTwoFactorEnabled,
          preferences: updatedUser.preferences,
          notifications: updatedUser.notifications,
          securityPreferences: updatedUser.securityPreferences,
        },
        error: {},
      });
    } catch (error) {
      console.error("Update profile controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  // Delete user account
  deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          data: {},
          error: "Not authenticated",
        });
        return;
      }

      const result = await this.authService.deleteAccount(req.user.id);

      if (result.success) {
        AuthMiddleware.clearTokenCookies(res);
        res.status(200).json({
          success: true,
          message: result.message,
          data: {},
          error: {},
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {},
          error: result.message,
        });
      }
    } catch (error) {
      console.error("Delete account controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  // Upload profile picture
  uploadProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          data: {},
          error: "Not authenticated",
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "No file uploaded",
          data: {},
          error: "Missing file",
        });
        return;
      }

      const { UserModel } = await import("../models/user.model");
      const imageUrl = `/uploads/profile-pictures/${req.file.filename}`;

      const updatedUser = await UserModel.findByIdAndUpdate(
        req.user.id,
        { $set: { profilePicture: imageUrl } },
        { new: true },
      );

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: "User not found",
          data: {},
          error: "User not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Profile picture uploaded successfully",
        data: {
          profilePicture: updatedUser.profilePicture,
        },
        error: {},
      });
    } catch (error) {
      console.error("Upload profile picture controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };

  // Upload cover image
  uploadCoverImage = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          data: {},
          error: "Not authenticated",
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "No file uploaded",
          data: {},
          error: "Missing file",
        });
        return;
      }

      const { UserModel } = await import("../models/user.model");
      const imageUrl = `/uploads/profile-pictures/${req.file.filename}`; // Using same directory for simplicity

      const updatedUser = await UserModel.findByIdAndUpdate(
        req.user.id,
        { $set: { coverImage: imageUrl } },
        { new: true },
      );

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: "User not found",
          data: {},
          error: "User not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Cover image uploaded successfully",
        data: {
          coverImage: updatedUser.coverImage,
        },
        error: {},
      });
    } catch (error) {
      console.error("Upload cover image controller error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {},
        error: "Internal server error",
      });
    }
  };
}
