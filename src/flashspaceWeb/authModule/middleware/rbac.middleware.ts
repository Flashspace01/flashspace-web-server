import { Request, Response, NextFunction } from "express";
import { UserRole } from "../models/user.model";
import { RolePermissions, Permission } from "../config/permissions.config";

export class RBACMiddleware {
    /**
     * Middleware to check if the authenticated user has the required permission.
     * Assumes AuthMiddleware.authenticate has already run and attached req.user.
     */
    static requirePermission(permission: Permission) {
        return (req: Request, res: Response, next: NextFunction) => {
            // 1. Ensure user is authenticated
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }

            const userRole = req.user.role as UserRole;

            // 2. Check if role exists in our configuration
            if (!userRole || !RolePermissions[userRole]) {
                return res.status(403).json({
                    success: false,
                    message: "User role not recognized or unauthorized"
                });
            }

            // 3. Check for the specific permission
            const allowedPermissions = RolePermissions[userRole];

            if (allowedPermissions.includes(permission)) {
                next();
            } else {
                return res.status(403).json({
                    success: false,
                    message: `Insufficient permissions. Required: ${permission}`
                });
            }
        };
    }

    /**
     * Helper to check multiple permissions (e.g., OR logic - has ANY of these permissions)
     */
    static requireAnyPermission(permissions: Permission[]) {
        return (req: Request, res: Response, next: NextFunction) => {
            if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });

            const userRole = req.user.role as UserRole;
            const userPermissions = RolePermissions[userRole] || [];

            const hasPermission = permissions.some(p => userPermissions.includes(p));

            if (hasPermission) {
                next();
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Insufficient permissions"
                });
            }
        };
    }
}
