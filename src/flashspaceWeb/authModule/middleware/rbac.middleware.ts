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
                console.log(`🔒 RBAC Debug: No user found for permission ${permission}`);
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }

            const userRole = req.user.role as UserRole;

            // 2. Check if role exists in our configuration
            if (!userRole || !RolePermissions[userRole]) {
                console.log(`🔒 RBAC Debug: Role ${userRole} not recognized`);
                return res.status(403).json({
                    success: false,
                    message: "User role not recognized or unauthorized"
                });
            }

            // 3. Check for the specific permission
            const allowedPermissions = RolePermissions[userRole];

            console.log(`🔒 RBAC Debug: User ${req.user.email} (${userRole}) checking permission ${permission}`);
            console.log(`🔒 RBAC Debug: Allowed permissions: ${allowedPermissions.join(', ')}`);

            if (allowedPermissions.includes(permission)) {
                console.log(`✅ RBAC Debug: Permission ${permission} GRANTED for ${userRole}`);
                next();
            } else {
                console.log(`❌ RBAC Debug: Permission ${permission} DENIED for ${userRole}`);
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
            if (!req.user) {
                console.log(`🔒 RBAC Debug: No user found for any permission check`);
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }

            const userRole = req.user.role as UserRole;
            const userPermissions = RolePermissions[userRole] || [];

            console.log(`🔒 RBAC Debug: User ${req.user.email} (${userRole}) checking ANY of: ${permissions.join(', ')}`);
            console.log(`🔒 RBAC Debug: User has permissions: ${userPermissions.join(', ')}`);

            const hasPermission = permissions.some(p => userPermissions.includes(p));

            if (hasPermission) {
                console.log(`✅ RBAC Debug: User has at least one required permission`);
                next();
            } else {
                console.log(`❌ RBAC Debug: User has none of the required permissions`);
                return res.status(403).json({
                    success: false,
                    message: "Insufficient permissions"
                });
            }
        };
    }

    /**
     * Helper to check if user has ALL of the specified permissions (AND logic)
     */
    static requireAllPermissions(permissions: Permission[]) {
        return (req: Request, res: Response, next: NextFunction) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }

            const userRole = req.user.role as UserRole;
            const userPermissions = RolePermissions[userRole] || [];

            const hasAllPermissions = permissions.every(p => userPermissions.includes(p));

            if (hasAllPermissions) {
                next();
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Insufficient permissions. All required permissions must be granted."
                });
            }
        };
    }
}