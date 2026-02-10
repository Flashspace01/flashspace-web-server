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

  /**
   * Middleware to require partner role
   */
  static requirePartner(req: Request, res: Response, next: NextFunction) {
    if (req.user?.role !== UserRole.PARTNER) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Partner role required.',
        error: 'Forbidden'
      });
    }
    next();
  }

  /**
   * Middleware to require space manager role
   */
  static requireSpaceManager(req: Request, res: Response, next: NextFunction) {
    if (req.user?.role !== UserRole.SPACE_MANAGER) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Space Manager role required.',
        error: 'Forbidden'
      });
    }
    next();
  }

  /**
   * Middleware to require sales role
   */
  static requireSales(req: Request, res: Response, next: NextFunction) {
    if (req.user?.role !== UserRole.SALES) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Sales role required.',
        error: 'Forbidden'
      });
    }
    next();
  }

  /**
   * Middleware to allow admin, partner, or space manager
   */
  static requireManagementRole(req: Request, res: Response, next: NextFunction) {
    const allowedRoles = [UserRole.ADMIN, UserRole.PARTNER, UserRole.SPACE_MANAGER];
    if (!req.user || !allowedRoles.includes(req.user.role as UserRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Management role required.',
        error: 'Forbidden'
      });
    }
    next();
  }
}
