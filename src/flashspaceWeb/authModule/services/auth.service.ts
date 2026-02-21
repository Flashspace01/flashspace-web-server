import { UserRepository } from '../repositories/user.repository';
import { PasswordUtil } from '../utils/password.util';
import { JwtUtil } from '../utils/jwt.util';
import { EmailUtil } from '../utils/email.util';
import { OTPUtil } from '../utils/otp.util';
import { User } from '../models/user.model';
import {
  SignupRequest,
  LoginRequest,
  AuthResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  GoogleProfile,
  JwtPayload,
  VerifyOTPRequest,
  ResendOTPRequest,
  OTPResponse
} from '../types/auth.types';
import { AuthProvider, UserRole } from '../models/user.model';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async signup(signupData: SignupRequest): Promise<AuthResponse> {
    try {
      const { email, password, confirmPassword, fullName, phoneNumber, role } = signupData;
      console.log('Backend signup - Processing role:', role);

      // Validate passwords match
      if (password !== confirmPassword) {
        return {
          success: false,
          message: 'Passwords do not match'
        };
      }

      // Validate password strength
      const passwordValidation = PasswordUtil.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.errors.join(', ')
        };
      }

      // Validate role (only allow 'user' or 'partner', default to 'user')
      const allowedRoles: string[] = [UserRole.USER, UserRole.PARTNER, UserRole.AFFILIATE];
      console.log('Allowed Roles:', allowedRoles);
      const selectedRole: UserRole = (role && allowedRoles.includes(role) ? role : UserRole.USER) as UserRole;
      console.log('Selected Role:', selectedRole);

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Hash password
      const hashedPassword = await PasswordUtil.hash(password);

      // Generate OTP for email verification
      const otpData = OTPUtil.generateWithExpiry(10); // 10 minutes validity

      // Create user
      const userData = {
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName,
        phoneNumber,
        authProvider: AuthProvider.LOCAL,
        role: selectedRole,
        isEmailVerified: false,
        emailVerificationOTP: otpData.otp,
        emailVerificationOTPExpiry: otpData.expiresAt,
        emailVerificationOTPAttempts: 0,
        lastOTPRequestTime: new Date(),
        otpRequestCount: 1,
        refreshTokens: []
      };

      const user = await this.userRepository.create(userData);

      // Send OTP email
      try {
        await EmailUtil.sendEmailVerificationOTP(email, otpData.otp, fullName);
        console.log('✅ Verification OTP sent to:', email);
        console.log('Signup Request Body:', JSON.stringify(signupData, null, 2));
        console.log('Received Role:', signupData.role);
        console.log('📌 OTP Code (for testing):', otpData.otp);
      } catch (emailError) {
        console.error('Error sending verification OTP:', emailError);
        // Continue with registration even if email fails
      }

      return {
        success: true,
        message: 'Account created successfully. Please check your email for the verification code.',
        user: {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        }
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: 'An error occurred during registration'
      };
    }
  }

  async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      const { email, password } = loginData;

      // Find user with password field for authentication
      const user = await this.userRepository.findByEmailForAuth(email);
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check if account is using local authentication
      if (user.authProvider !== AuthProvider.LOCAL) {
        return {
          success: false,
          message: `Please login using ${user.authProvider.toLowerCase()}`
        };
      }

      // Check if password exists (for local auth)
      if (!user.password) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Verify password
      const isPasswordValid = await PasswordUtil.compare(password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return {
          success: false,
          message: 'Please verify your email before logging in'
        };
      }

      // Generate tokens
      const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      };

      const tokens = JwtUtil.generateTokenPair(tokenPayload);

      // Save refresh token
      await this.userRepository.addRefreshToken(user._id.toString(), tokens.refreshToken);

      // Update last login
      await this.userRepository.update(user._id.toString(), {
        lastLogin: new Date()
      });

      return {
        success: true,
        message: 'Login successful',
        user: {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        },
        tokens
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred during login'
      };
    }
  }

  async googleAuthWithToken(idToken: string, role?: string): Promise<AuthResponse> {
    try {
      // Import GoogleUtil
      const { GoogleUtil } = await import('../utils/google.util');

      // Verify the token with Google
      const profile = await GoogleUtil.verifyIdToken(idToken);

      if (!profile) {
        return {
          success: false,
          message: 'Invalid Google token'
        };
      }

      if (role) {
        profile.role = role;
      }

      // Continue with existing Google auth logic
      return await this.googleAuth(profile);
    } catch (error) {
      console.error('Google token auth error:', error);
      return {
        success: false,
        message: 'Failed to authenticate with Google'
      };
    }
  }

  async googleAuth(profile: GoogleProfile): Promise<AuthResponse> {
    try {
      const email = profile.emails[0].value;
      let user = await this.userRepository.findByEmail(email);

      if (user) {
        // User exists, check if Google ID matches
        if (user.authProvider === AuthProvider.GOOGLE && user.googleId === profile.id) {
          // Update last login
          await this.userRepository.update(user._id.toString(), {
            lastLogin: new Date()
          });
        } else if (user.authProvider === AuthProvider.LOCAL) {
          // Link Google account to existing local account
          await this.userRepository.update(user._id.toString(), {
            googleId: profile.id,
            authProvider: AuthProvider.GOOGLE,
            isEmailVerified: true, // Google emails are pre-verified
            lastLogin: new Date()
          });
        } else {
          return {
            success: false,
            message: 'Account exists with different authentication provider'
          };
        }
      } else {
        // Create new user
        const userData = {
          email: email.toLowerCase(),
          fullName: profile.displayName,
          googleId: profile.id,
          authProvider: AuthProvider.GOOGLE,
          role: (profile.role as UserRole) || UserRole.USER, // Use provided role or default to USER
          isEmailVerified: true, // Google emails are pre-verified
          refreshTokens: []
        };

        user = await this.userRepository.create(userData);

        // Send welcome email
        try {
          await EmailUtil.sendWelcomeEmail(email, profile.displayName);
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
        }
      }

      // Generate tokens
      const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      };

      const tokens = JwtUtil.generateTokenPair(tokenPayload);

      // Save refresh token
      await this.userRepository.addRefreshToken(user._id.toString(), tokens.refreshToken);

      return {
        success: true,
        message: 'Google authentication successful',
        user: {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        },
        tokens
      };
    } catch (error) {
      console.error('Google auth error:', error);
      return {
        success: false,
        message: 'An error occurred during Google authentication'
      };
    }
  }

  async verifyEmail(token: string): Promise<AuthResponse> {
    try {
      const user = await this.userRepository.verifyEmail(token);

      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired verification token'
        };
      }

      // Send welcome email
      try {
        await EmailUtil.sendWelcomeEmail(user.email, user.fullName);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }

      return {
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        }
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        message: 'An error occurred during email verification'
      };
    }
  }

  async forgotPassword(forgotPasswordData: ForgotPasswordRequest): Promise<AuthResponse> {
    try {
      const { email } = forgotPasswordData;

      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        };
      }

      // Generate reset token
      const resetToken = EmailUtil.generateVerificationToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      await this.userRepository.update(user._id.toString(), {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      });

      // Send reset email
      try {
        await EmailUtil.sendPasswordResetEmail(email, resetToken, user.fullName);
      } catch (emailError) {
        console.error('Error sending reset email:', emailError);
        return {
          success: false,
          message: 'Error sending password reset email'
        };
      }

      return {
        success: true,
        message: 'Password reset link has been sent to your email.'
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: 'An error occurred processing your request'
      };
    }
  }

  async resetPassword(resetPasswordData: ResetPasswordRequest): Promise<AuthResponse> {
    try {
      const { token, password, confirmPassword } = resetPasswordData;

      if (password !== confirmPassword) {
        return {
          success: false,
          message: 'Passwords do not match'
        };
      }

      // Validate password strength
      const passwordValidation = PasswordUtil.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.errors.join(', ')
        };
      }

      // Find user by reset token
      const user = await this.userRepository.findByPasswordResetToken(token);
      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired reset token'
        };
      }

      // Hash new password
      const hashedPassword = await PasswordUtil.hash(password);

      // Update user
      await this.userRepository.update(user._id.toString(), {
        password: hashedPassword,
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
        refreshTokens: [] // Clear all refresh tokens for security
      });

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: 'An error occurred resetting your password'
      };
    }
  }

  async changePassword(userId: string, changePasswordData: ChangePasswordRequest): Promise<AuthResponse> {
    try {
      const { currentPassword, newPassword, confirmPassword } = changePasswordData;

      if (newPassword !== confirmPassword) {
        return {
          success: false,
          message: 'New passwords do not match'
        };
      }

      // Validate password strength
      const passwordValidation = PasswordUtil.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.errors.join(', ')
        };
      }

      // Get user with password
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // For local auth, get password and verify
      if (user.authProvider === AuthProvider.LOCAL) {
        const userWithPassword = await this.userRepository.findByEmailForAuth(user.email);
        if (!userWithPassword?.password) {
          return {
            success: false,
            message: 'Password not set for this account'
          };
        }

        const isCurrentPasswordValid = await PasswordUtil.compare(currentPassword, userWithPassword.password);
        if (!isCurrentPasswordValid) {
          return {
            success: false,
            message: 'Current password is incorrect'
          };
        }
      }

      // Hash new password
      const hashedPassword = await PasswordUtil.hash(newPassword);

      // Update user
      await this.userRepository.update(userId, {
        password: hashedPassword,
        refreshTokens: [] // Clear all refresh tokens for security
      });

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'An error occurred changing your password'
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = JwtUtil.verifyRefreshToken(refreshToken);

      // Find user with this refresh token
      const user = await this.userRepository.findByRefreshToken(refreshToken);
      if (!user || user._id.toString() !== decoded.userId) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Generate new tokens
      const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      };

      const tokens = JwtUtil.generateTokenPair(tokenPayload);

      // Replace old refresh token with new one
      await this.userRepository.removeRefreshToken(user._id.toString(), refreshToken);
      await this.userRepository.addRefreshToken(user._id.toString(), tokens.refreshToken);

      return {
        success: true,
        message: 'Token refreshed successfully',
        tokens
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      return {
        success: false,
        message: 'Invalid refresh token'
      };
    }
  }

  async logout(userId: string, refreshToken: string): Promise<AuthResponse> {
    try {
      await this.userRepository.removeRefreshToken(userId, refreshToken);

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'An error occurred during logout'
      };
    }
  }

  async logoutAll(userId: string): Promise<AuthResponse> {
    try {
      await this.userRepository.clearAllRefreshTokens(userId);

      return {
        success: true,
        message: 'Logged out from all devices successfully'
      };
    } catch (error) {
      console.error('Logout all error:', error);
      return {
        success: false,
        message: 'An error occurred during logout'
      };
    }
  }

  async getUserProfile(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findById(userId);
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  }

  // OTP Verification Methods
  async verifyEmailOTP(verifyData: VerifyOTPRequest): Promise<AuthResponse> {
    try {
      const { email, otp } = verifyData;

      // Find user with OTP data
      const user = await this.userRepository.findByEmailWithOTP(email);

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return {
          success: false,
          message: 'Email is already verified'
        };
      }

      // Check if OTP exists
      if (!user.emailVerificationOTP || !user.emailVerificationOTPExpiry) {
        return {
          success: false,
          message: 'No OTP found. Please request a new verification code.'
        };
      }

      // Verify OTP
      const verificationResult = OTPUtil.verify(
        otp,
        user.emailVerificationOTP,
        user.emailVerificationOTPExpiry,
        user.emailVerificationOTPAttempts
      );

      // Handle expired OTP
      if (verificationResult.isExpired) {
        await this.userRepository.clearOTPData(user._id.toString());
        return {
          success: false,
          message: verificationResult.message
        };
      }

      // Handle max attempts exceeded
      if (verificationResult.attemptsExceeded) {
        await this.userRepository.clearOTPData(user._id.toString());
        return {
          success: false,
          message: verificationResult.message
        };
      }

      // Handle invalid OTP
      if (!verificationResult.isValid) {
        // Increment attempts
        await this.userRepository.incrementOTPAttempts(user._id.toString());
        const remainingAttempts = 3 - (user.emailVerificationOTPAttempts + 1);

        return {
          success: false,
          message: `Invalid OTP. You have ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
        };
      }

      // OTP is valid - verify email
      const verifiedUser = await this.userRepository.verifyEmailWithOTP(user._id.toString());

      if (!verifiedUser) {
        return {
          success: false,
          message: 'Failed to verify email'
        };
      }

      // Send welcome email
      try {
        await EmailUtil.sendWelcomeEmail(email, user.fullName);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }

      // Generate tokens
      const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: verifiedUser._id.toString(),
        email: verifiedUser.email,
        role: verifiedUser.role
      };

      const tokens = JwtUtil.generateTokenPair(tokenPayload);

      // Save refresh token
      await this.userRepository.addRefreshToken(verifiedUser._id.toString(), tokens.refreshToken);

      return {
        success: true,
        message: 'Email verified successfully! Welcome to FlashSpace.',
        user: {
          id: verifiedUser._id.toString(),
          email: verifiedUser.email,
          fullName: verifiedUser.fullName,
          role: verifiedUser.role,
          isEmailVerified: verifiedUser.isEmailVerified
        },
        tokens
      };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        message: 'An error occurred during verification'
      };
    }
  }

  async resendVerificationOTP(resendData: ResendOTPRequest): Promise<OTPResponse> {
    try {
      const { email } = resendData;

      // Find user
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return {
          success: false,
          message: 'Email is already verified'
        };
      }

      // Check rate limit
      const rateLimit = OTPUtil.checkRateLimit(
        user.lastOTPRequestTime,
        user.otpRequestCount
      );

      if (!rateLimit.allowed) {
        return {
          success: false,
          message: rateLimit.message,
          retryAfter: rateLimit.retryAfter
        };
      }

      // Generate new OTP
      const otpData = OTPUtil.generateWithExpiry(10); // 10 minutes validity

      // Update user with new OTP
      await this.userRepository.updateEmailVerificationOTP(
        email,
        otpData.otp,
        otpData.expiresAt
      );

      // Send OTP email
      try {
        await EmailUtil.sendEmailVerificationOTP(email, otpData.otp, user.fullName);
        console.log('✅ New verification OTP sent to:', email);
      } catch (emailError) {
        console.error('Error sending verification OTP:', emailError);
        return {
          success: false,
          message: 'Failed to send verification code. Please try again.'
        };
      }

      return {
        success: true,
        message: 'A new verification code has been sent to your email.'
      };
    } catch (error) {
      console.error('Resend OTP error:', error);
      return {
        success: false,
        message: 'An error occurred while sending verification code'
      };
    }
  }
}