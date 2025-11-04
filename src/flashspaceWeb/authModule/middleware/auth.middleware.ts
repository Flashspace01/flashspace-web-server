import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt.util';
import { UserRepository } from '../repositories/user.repository';
import { UserRole } from '../models/user.model';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export class AuthMiddleware {
  private static userRepository = new UserRepository();

  // Verify JWT token and attach user to request
  static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Access token required'
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      try {
        const decoded = JwtUtil.verifyAccessToken(token);
        
        // Verify user still exists and is active
        const user = await this.userRepository.findById(decoded.userId);
        if (!user) {
          res.status(401).json({
            success: false,
            message: 'User not found'
          });
          return;
        }

        // Attach user info to request
        req.user = {
          id: user._id.toString(),
          email: user.email,
          role: user.role
        };

        next();
      } catch (tokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
        return;
      }
    } catch (error) {
      console.error('Authentication middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
      return;
    }
  }

  // Optional authentication - doesn't fail if no token
  static async optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next();
        return;
      }

      const token = authHeader.substring(7);

      try {
        const decoded = JwtUtil.verifyAccessToken(token);
        const user = await this.userRepository.findById(decoded.userId);
        
        if (user) {
          req.user = {
            id: user._id.toString(),
            email: user.email,
            role: user.role
          };
        }
      } catch (tokenError) {
        // Ignore token errors in optional auth
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
    
    // Set access token cookie (shorter expiry)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token cookie (longer expiry)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  // Clear authentication cookies
  static clearTokenCookies(res: Response): void {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
  }
}