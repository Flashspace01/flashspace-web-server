import { Router } from "express";
import {
  getAvailability,
  createHold,
  confirmBooking,
  cancelBooking,
  getUserBookings,
  getBookingById,
} from "./seating.controller";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";

export const SeatBookingRoutes = Router();

// Availability doesn't strictly need auth if it's public, but we can leave it public
SeatBookingRoutes.get("/availability/:spaceId", getAvailability);

// All these routes require authentication
SeatBookingRoutes.use(AuthMiddleware.authenticate);

SeatBookingRoutes.post("/hold", createHold);
SeatBookingRoutes.post("/confirm/:bookingId", confirmBooking);
SeatBookingRoutes.delete("/:bookingId", cancelBooking);
SeatBookingRoutes.get("/user", getUserBookings);
SeatBookingRoutes.get("/:bookingId", getBookingById);
