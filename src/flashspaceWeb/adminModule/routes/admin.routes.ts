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
adminRoutes.delete("/users/:id", AdminController.deleteUser);

// Bookings Routes
adminRoutes.get("/bookings", AdminController.getAllBookings);

// KYC Management Routes
adminRoutes.get("/kyc/pending", AdminController.getPendingKYC);
adminRoutes.get("/kyc/partners", AdminController.getPartnerKYCList);
adminRoutes.get("/kyc/partners/:id", AdminController.getPartnerKYCById);
adminRoutes.put("/kyc/:id/review", AdminController.reviewKYC);
adminRoutes.get("/kyc/:id", AdminController.getKYCById);
adminRoutes.put("/kyc/:id/documents/:docId/review", AdminController.reviewKYCDocument);
