import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { adminRateLimiter } from "../../../config/rateLimiter.config";

export const adminRoutes = Router();

// Protect all admin routes
adminRoutes.use(AuthMiddleware.authenticate);
adminRoutes.use(AuthMiddleware.requireAdmin);
adminRoutes.use(adminRateLimiter);

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
