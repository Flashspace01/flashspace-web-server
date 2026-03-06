import { Router } from "express";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import { UserRole } from "../authModule/models/user.model"; // <-- ADDED
import {
  createVirtualOffice,
  getAllVirtualOffices,
  getVirtualOfficeById,
  getVirtualOfficesByCity,
  updateVirtualOffice,
  deleteVirtualOffice,
  getPartnerVirtualOffices,
  getUserVirtualOffices,
  getUserVirtualOfficesByCity,
  getUserVirtualOfficeById,
} from "./virtualOffice.controller";

export const virtualOfficeRoutes = Router();

// Public Routes
virtualOfficeRoutes.get("/getAll", getAllVirtualOffices);
virtualOfficeRoutes.get("/getByCity/:city", getVirtualOfficesByCity);
virtualOfficeRoutes.get("/getById/:virtualOfficeId", getVirtualOfficeById);

// --- User-Facing Routes (Active Only) ---
virtualOfficeRoutes.get("/user/all", getUserVirtualOffices);
virtualOfficeRoutes.get("/user/city/:city", getUserVirtualOfficesByCity);
virtualOfficeRoutes.get("/user/id/:virtualOfficeId", getUserVirtualOfficeById);

// Protected Routes (Partners & Admins)
virtualOfficeRoutes.post(
  "/create",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN), // <-- FIXED
  createVirtualOffice,
);

virtualOfficeRoutes.put(
  "/update/:virtualOfficeId",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN), // <-- FIXED
  updateVirtualOffice,
);

virtualOfficeRoutes.delete(
  "/delete/:virtualOfficeId",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN), // <-- FIXED
  deleteVirtualOffice,
);

// Partner Specific Route
virtualOfficeRoutes.get(
  "/partner/spaces",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER), // <-- FIXED
  getPartnerVirtualOffices,
);
