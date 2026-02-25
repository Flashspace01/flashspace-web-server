import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/user.model';
import { STAFF_ROLES } from '../config/permissions.config';

export class RoleMiddleware {
  /**
   * Middleware to require admin role
   */
  static requireAdmin(req: Request, res: Response, next: NextFunction) {
    const adminRoles = STAFF_ROLES;

    console.log(`🛡️ Role Check [requireAdmin]: User ${req.user?.email} has role: ${req.user?.role}`);
    console.log(`🛡️ Allowed roles: ${adminRoles.join(', ')}`);

    if (!req.user || !adminRoles.includes(req.user.role as UserRole)) {
      console.log(`❌ Role Check DENIED for ${req.user?.role}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin portal role required.',
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
    const isStaff = STAFF_ROLES.includes(req.user?.role as UserRole);
    if (!req.user || (!isStaff && req.user.role !== UserRole.USER)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Authentication required.',
        error: 'Forbidden'
      });
    }
    next();
  }

  /**
   * Middleware to allow both user and affiliate
   */
  static requireClientRole(req: Request, res: Response, next: NextFunction) {
    const allowedRoles = [UserRole.ADMIN, UserRole.USER, UserRole.AFFILIATE];
    if (!req.user || !allowedRoles.includes(req.user.role as UserRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Client authentication required.',
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
   * Middleware to allow admin or partner
   */
  static requireManagementRole(req: Request, res: Response, next: NextFunction) {
    const allowedRoles = [...STAFF_ROLES, UserRole.PARTNER];
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