import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { RBACMiddleware } from "../../authModule/middleware/rbac.middleware";
import { Permission } from "../../authModule/config/permissions.config";
import { ticketRoutes } from '../../ticketModule/routes/ticket.routes';


console.log("Admin Routes Loaded");
export const adminRoutes = Router();

// 1. Authenticate all users
adminRoutes.use(AuthMiddleware.authenticate);

// 2. Dashboard - Accessible by Admins, Partners, Space Managers, Sales
// We check if they have at least one relevant permission to be here
adminRoutes.get("/dashboard",
    RBACMiddleware.requireAnyPermission([
        Permission.MANAGE_ALL_SPACES,
        Permission.MANAGE_OWN_SPACES,
        Permission.VIEW_ALL_SPACES
    ]),
    AdminController.getDashboardStats
);

// 3. User Management - Currently Super Admin only
adminRoutes.get("/users",
    RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
    AdminController.getUsers
);
adminRoutes.post("/users",
    RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
    AdminController.createUser
);
adminRoutes.put("/users/:id",
    RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
    AdminController.updateUser
);
// Alias for PATCH
adminRoutes.patch("/users/:id",
    RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
    AdminController.updateUser
);
// Alias for explicit update path
adminRoutes.put("/users/update/:id",
    RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
    AdminController.updateUser
);

adminRoutes.delete("/users/:id",
    RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
    AdminController.deleteUser
);

// 5. KYC Management
adminRoutes.get("/kyc/pending",
    RBACMiddleware.requireAnyPermission([
        Permission.MANAGE_ALL_USERS, // Admin
        Permission.MANAGE_OWN_SPACES // Partner/Manager (needs refinement later)
    ]),
    AdminController.getPendingKYC
);
adminRoutes.put("/kyc/:id/review",
    RBACMiddleware.requireAnyPermission([
        Permission.MANAGE_ALL_USERS,
        Permission.MANAGE_OWN_SPACES
    ]),
    AdminController.reviewKYC
);

// 6. Ticket Management Routes (from ticket module)
adminRoutes.use("/tickets", ticketRoutes);

// Note: The ticket routes from ticketModule already have /admin prefix
// So they will be accessible at:
// GET /api/admin/tickets/admin/all
// GET /api/admin/tickets/admin/stats
// PUT /api/admin/tickets/admin/:ticketId
// etc.
// 4. Bookings - Accessible by all roles (scoped)
adminRoutes.get("/bookings",
    RBACMiddleware.requireAnyPermission([
        Permission.VIEW_ALL_BOOKINGS,
        Permission.VIEW_OWN_BOOKINGS
    ]),
    AdminController.getAllBookings
);

// 5. KYC Management
adminRoutes.get("/kyc/pending",
    RBACMiddleware.requireAnyPermission([
        Permission.MANAGE_ALL_USERS, // Admin
        Permission.MANAGE_OWN_SPACES // Partner/Manager (needs refinement later)
    ]),
    AdminController.getPendingKYC
);
adminRoutes.put("/kyc/:id/review",
    RBACMiddleware.requireAnyPermission([
        Permission.MANAGE_ALL_USERS,
        Permission.MANAGE_OWN_SPACES
    ]),
    AdminController.reviewKYC
);
