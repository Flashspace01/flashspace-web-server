import { Request, Response } from "express";
import { UserRole } from "../authModule/models/user.model";
import { BookingService } from "./seating.service";
import {
  getAvailabilitySchema,
  createHoldSchema,
  confirmBookingSchema,
  cancelBookingSchema,
  getUserBookingsSchema,
  getBookingByIdSchema,
} from "./seating.validation";

const sendError = (
  res: Response,
  status: number,
  message: string,
  error: any = null,
) => {
  return res.status(status).json({
    success: false,
    message,
    data: {},
    error:
      process.env.NODE_ENV === "development" ? error : "Internal Server Error",
  });
};

export const getAvailability = async (req: Request, res: Response) => {
  try {
    const validation = getAvailabilitySchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error.issues);
    }

    const { spaceId } = validation.data.params;
    const { start, end } = validation.data.query;

    const startTime = new Date(start);
    const endTime = new Date(end);

    const availability = await BookingService.getAvailability(
      spaceId,
      startTime,
      endTime,
    );

    res.status(200).json({
      success: true,
      message: "Availability retrieved successfully",
      data: availability,
    });
  } catch (err: any) {
    if (
      err.message === "Invalid space ID format" ||
      err.message === "Space not found"
    ) {
      return sendError(res, 404, err.message);
    }
    sendError(res, 500, "Failed to retrieve availability", err);
  }
};

export const createHold = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return sendError(res, 401, "Unauthorized");

    // KYC check for seat holds
    const isSpecialRole = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT, UserRole.SALES].includes((req as any).user?.role);
    if (!isSpecialRole && !(req as any).user?.kycVerified) {
      return sendError(res, 403, "KYC verification is required to hold seats. Please verify your profile first.");
    }

    const validation = createHoldSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error.issues);
    }

    const { spaceId, seatIds, startTime, endTime } = validation.data.body;

    const newHold = await BookingService.createHold(
      userId,
      spaceId,
      seatIds,
      new Date(startTime),
      new Date(endTime),
    );

    res.status(201).json({
      success: true,
      message: "Hold created successfully",
      data: newHold,
    });
  } catch (err: any) {
    if (
      err.message.includes("not found") ||
      err.message.includes("already booked")
    ) {
      return sendError(res, 400, err.message);
    }
    sendError(res, 500, "Failed to create hold", err);
  }
};

export const confirmBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return sendError(res, 401, "Unauthorized");

    const validation = confirmBookingSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error.issues);
    }

    const { paymentId } = validation.data.body;
    const { bookingId } = validation.data.params;

    const confirmedBooking = await BookingService.confirmBooking(
      bookingId,
      userId,
      paymentId,
    );

    res.status(200).json({
      success: true,
      message: "Booking confirmed successfully",
      data: confirmedBooking,
    });
  } catch (err: any) {
    sendError(res, 400, err.message, err);
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    if (!userId) return sendError(res, 401, "Unauthorized");

    const validation = cancelBookingSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error.issues);
    }

    const { bookingId } = validation.data.params;

    const cancelledBooking = await BookingService.cancelBooking(
      bookingId,
      userId,
      userRole,
    );

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: cancelledBooking,
    });
  } catch (err: any) {
    sendError(res, 400, err.message, err);
  }
};

export const getUserBookings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return sendError(res, 401, "Unauthorized");

    const validation = getUserBookingsSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error.issues);
    }

    const { limit, page } = validation.data.query;
    const _limit = limit ? Math.min(limit, 100) : 10;
    const _page = page ? Math.max(page, 1) : 1;

    const bookings = await BookingService.getUserBookings(
      userId,
      _limit,
      _page,
    );

    res.status(200).json({
      success: true,
      message: "User bookings retrieved successfully",
      data: bookings,
    });
  } catch (err: any) {
    sendError(res, 500, "Failed to retrieve user bookings", err);
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const validation = getBookingByIdSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error.issues);
    }

    const { bookingId } = validation.data.params;
    const booking = await BookingService.getBookingById(bookingId);

    if (!booking) return sendError(res, 404, "Booking not found");

    res.status(200).json({
      success: true,
      message: "Booking retrieved successfully",
      data: booking,
    });
  } catch (err: any) {
    sendError(res, 500, "Failed to retrieve booking", err);
  }
};
