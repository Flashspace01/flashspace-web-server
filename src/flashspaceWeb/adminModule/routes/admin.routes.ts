import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";

export const adminRoutes = Router();

// Protect all admin routes
adminRoutes.use(AuthMiddleware.authenticate);
adminRoutes.use(AuthMiddleware.requireAdmin);

// Dashboard Routes
adminRoutes.get("/dashboard", AdminController.getDashboardStats);

// User Management Routes
adminRoutes.get("/users", AdminController.getUsers);

// KYC Management Routes
adminRoutes.get("/kyc/pending", AdminController.getPendingKYC);
