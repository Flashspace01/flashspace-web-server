import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { RoleMiddleware } from "../../authModule/middleware/role.middleware";
import { ticketRoutes } from '../../ticketModule/routes/ticket.routes';

export const adminRoutes = Router();

// Protect all admin routes
adminRoutes.use(AuthMiddleware.authenticate);
adminRoutes.use(RoleMiddleware.requireAdmin);

// Dashboard Routes
adminRoutes.get("/dashboard", AdminController.getDashboardStats);

// User Management Routes
adminRoutes.get("/users", AdminController.getUsers);
adminRoutes.delete("/users/:id", AdminController.deleteUser);

// Bookings Routes
adminRoutes.get("/bookings", AdminController.getAllBookings);

// KYC Management Routes
adminRoutes.get("/kyc/pending", AdminController.getPendingKYC);
adminRoutes.put("/kyc/:id/review", AdminController.reviewKYC);

// Ticket Management Routes (from ticket module)
adminRoutes.use("/tickets", ticketRoutes);

// Note: The ticket routes from ticketModule already have /admin prefix
// So they will be accessible at:
// GET /api/admin/tickets/admin/all
// GET /api/admin/tickets/admin/stats
// PUT /api/admin/tickets/admin/:ticketId
// etc.