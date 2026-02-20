import { Router } from "express";
import {
  createEventSpace,
  updateEventSpace,
  getAllEventSpaces,
  getEventSpaceById,
  getEventSpacesByCity,
  deleteEventSpace,
  getPartnerEventSpaces,
} from "./eventSpace.controller";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import { UserRole } from "../authModule/models/user.model";

const router = Router();

// Public Routes
router.get("/getAll", getAllEventSpaces);
router.get("/getById/:eventSpaceId", getEventSpaceById);
router.get("/getByCity/:city", getEventSpacesByCity);

// Partner Routes (Protected)
router.post(
  "/create",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN),
  createEventSpace,
);
router.put(
  "/update/:eventSpaceId",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN),
  updateEventSpace,
);
router.delete(
  "/delete/:eventSpaceId",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN),
  deleteEventSpace,
);
router.get(
  "/partner/my-spaces",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER),
  getPartnerEventSpaces,
);

export const eventSpaceRoutes = router;
