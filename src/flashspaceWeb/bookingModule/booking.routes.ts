import { Router } from "express";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import { UserRole } from "../authModule/models/user.model"; // Added Import
import {
  getAllBookings,
  getBookingById,
  getBookingsByProperty,
  toggleAutoRenew,
  linkBookingToProfile,
  getPartnerSpaceBookings,
  getPartnerDashboardOverview,
} from "./booking.controller";

const router = Router();

// All booking routes require authentication
router.use(AuthMiddleware.authenticate);

// --- User Booking Routes ---
router.get("/", getAllBookings);
router.get("/property/:spaceId", getBookingsByProperty);
router.get("/:bookingId", getBookingById);
router.patch("/:bookingId/auto-renew", toggleAutoRenew);
router.post("/:bookingId/link-profile", linkBookingToProfile);

// --- Partner Booking Routes (SECURED) ---
router.get(
  "/partner/overview", 
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN), // Added RBAC
  getPartnerDashboardOverview
);
router.get(
  "/partner/space/:spaceId", 
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN), // Added RBAC
  getPartnerSpaceBookings
);

export default router;