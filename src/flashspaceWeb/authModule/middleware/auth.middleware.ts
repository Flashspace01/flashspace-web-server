import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt.util';
import { UserRepository } from '../repositories/user.repository';
import { UserRole } from '../models/user.model';
import { AuthUser } from '../types/auth.types';

export class AuthMiddleware {
  private static userRepository = new UserRepository();

  // Verify JWT token and attach user to request
  static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract token from cookies (primary method)
      let token = req.cookies?.accessToken;

      // Fallback to Authorization header for backward compatibility (optional)
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        res.status(401).json({
          success: false,
          message: 'Access token required'
        });
        return;
      }

      try {
        const decoded = JwtUtil.verifyAccessToken(token);

        // Verify user still exists and is active
        const user = await AuthMiddleware.userRepository.findById(decoded.userId);
        if (!user) {
          res.status(401).json({
            success: false,
            message: 'User not found'
          });
          return;
        }

        // Attach user info to request
        req.user = {
          _id: user._id.toString(),
          id: user._id.toString(),
          email: user.email,
          role: user.role
        } as AuthUser;

        next();
      } catch (tokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
        return;
      }
    } catch (error) {
      console.error('Authentication middleware CRITICAL error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error in auth'
      });
      return;
    }
  }


  // Optional authentication with auto-refresh - doesn't fail if no token
  // But will try to refresh expired access token using refresh token
  static async optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // DEBUG: Log all cookies received
      console.log('🍪 Cookies received:', Object.keys(req.cookies || {}));

      // Extract access token from cookies (primary method)
      let accessToken = req.cookies?.accessToken;

      // Fallback to Authorization header
      if (!accessToken) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          accessToken = authHeader.substring(7);
        }
      }

      console.log('🔑 Access token present:', !!accessToken);
      console.log('🔄 Refresh token present:', !!req.cookies?.refreshToken);

      // Case 1: No access token at all
      if (!accessToken) {
        // Try to use refresh token to get new access token
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
          try {
            const decoded = JwtUtil.verifyRefreshToken(refreshToken);
            const user = await AuthMiddleware.userRepository.findById(decoded.userId);

            if (user) {
              // Generate new tokens
              const newTokens = JwtUtil.generateTokenPair({
                userId: user._id.toString(),
                email: user.email,
                role: user.role
              });

              // Set new cookies
              AuthMiddleware.setTokenCookies(res, newTokens.accessToken, newTokens.refreshToken);

              // Attach user to request
              req.user = {
                _id: user._id.toString(),
                id: user._id.toString(),
                email: user.email,
                role: user.role
              };
              console.log('✅ Auto-refreshed tokens for user:', user.email);
            }
          } catch (refreshError) {
            // Refresh token also invalid, continue without auth
            console.log('⚠️ Refresh token invalid, user not authenticated');
          }
        } else {
          console.log('⚠️ No tokens found in cookies');
        }
        next();
        return;
      }

      // Case 2: Access token exists, try to verify it
      try {
        const decoded = JwtUtil.verifyAccessToken(accessToken);
        console.log('✅ Access token valid for userId:', decoded.userId);
        const user = await AuthMiddleware.userRepository.findById(decoded.userId);

        if (user) {
          req.user = {
            _id: user._id.toString(),
            id: user._id.toString(),
            email: user.email,
            role: user.role
          };
          console.log('✅ User authenticated:', user.email);
        } else {
          console.log('⚠️ User not found in database for userId:', decoded.userId);
        }
      } catch (tokenError: any) {
        console.log('⚠️ Access token verification failed:', tokenError.message);
        // Access token expired/invalid, try refresh token
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
          try {
            const decoded = JwtUtil.verifyRefreshToken(refreshToken);
            console.log('✅ Refresh token valid for userId:', decoded.userId);
            const user = await AuthMiddleware.userRepository.findById(decoded.userId);

            if (user) {
              // Generate new tokens
              const newTokens = JwtUtil.generateTokenPair({
                userId: user._id.toString(),
                email: user.email,
                role: user.role
              });

              // Set new cookies
              AuthMiddleware.setTokenCookies(res, newTokens.accessToken, newTokens.refreshToken);

              // Attach user to request
              req.user = {
                _id: user._id.toString(),
                id: user._id.toString(),
                email: user.email,
                role: user.role
              };
              console.log('✅ Auto-refreshed expired access token for user:', user.email);
            } else {
              console.log('⚠️ User not found for refresh token userId:', decoded.userId);
            }
          } catch (refreshError: any) {
            // Both tokens invalid, continue without auth
            console.log('⚠️ Refresh token verification failed:', refreshError.message);
          }
        } else {
          console.log('⚠️ No refresh token available');
        }
      }

      next();
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      next();
    }
  }

  // Require specific roles
  static requireRole(...roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!roles.includes(req.user.role as UserRole)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      next();
    };
  }

  // Require admin role
  static requireAdmin = AuthMiddleware.requireRole(UserRole.ADMIN);

  // Require vendor role (can access vendor features)
  static requireVendor = AuthMiddleware.requireRole(UserRole.VENDOR, UserRole.ADMIN);

  // Check if user is verified
  static async requireVerifiedEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const user = await AuthMiddleware.userRepository.findById(req.user.id);
      if (!user || !user.isEmailVerified) {
        res.status(403).json({
          success: false,
          message: 'Email verification required'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Email verification middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
      return;
    }
  }

  // Rate limiting for sensitive operations
  static rateLimitMap = new Map<string, { attempts: number; resetTime: number }>();

  static rateLimit(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = req.ip || 'unknown';
      const now = Date.now();

      const userAttempts = this.rateLimitMap.get(key) || { attempts: 0, resetTime: now + windowMs };

      if (now > userAttempts.resetTime) {
        // Reset the window
        userAttempts.attempts = 0;
        userAttempts.resetTime = now + windowMs;
      }

      if (userAttempts.attempts >= maxAttempts) {
        res.status(429).json({
          success: false,
          message: 'Too many attempts. Please try again later.'
        });
        return;
      }

      userAttempts.attempts++;
      this.rateLimitMap.set(key, userAttempts);

      next();
    };
  }

  // Extract refresh token from cookies
  static extractRefreshToken(req: Request): string | null {
    return req.cookies?.refreshToken || null;
  }

  // Set secure cookies
  static setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';

    // Cookie configuration for cross-origin requests
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Only true in production (requires HTTPS)
      sameSite: isProduction ? ('none' as const) : ('lax' as const), // 'none' for production cross-origin, 'lax' for dev
      path: '/',
    };

    // Set access token cookie (shorter expiry)
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token cookie (longer expiry)
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  // Clear authentication cookies
  static clearTokenCookies(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
  }
}
