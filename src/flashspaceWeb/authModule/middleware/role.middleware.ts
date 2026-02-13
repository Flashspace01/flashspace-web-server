import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/user.model';

export class RoleMiddleware {
  /**
   * Middleware to require admin role
   */
  static requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.user?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
        error: 'Forbidden'
      });
    }
    next();
  }

  /**
   * Middleware to require user role
   */
  static requireUser(req: Request, res: Response, next: NextFunction) {
    if (req.user?.role !== UserRole.USER) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User role required.',
        error: 'Forbidden'
      });
    }
    next();
  }

  /**
   * Middleware to allow both admin and user
   */
  static requireAdminOrUser(req: Request, res: Response, next: NextFunction) {
    if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.USER)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Authentication required.',
        error: 'Forbidden'
      });
    }
    next();
  }
}