import { Request, Response } from "express";
import { BookingService } from "./seating.service";

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
    const { spaceId } = req.params;
    const { start, end } = req.query;

    if (!start || !end) {
      return sendError(res, 400, "start and end times are required");
    }

    const startTime = new Date(start as string);
    const endTime = new Date(end as string);

    const availability = await BookingService.getAvailability(
      spaceId as string,
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
    const { spaceId, seatIds, startTime, endTime } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) return sendError(res, 401, "Unauthorized");

    if (
      !spaceId ||
      !seatIds ||
      !Array.isArray(seatIds) ||
      !startTime ||
      !endTime
    ) {
      return sendError(res, 400, "Missing required fields");
    }

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
    const { paymentId } = req.body;
    const { bookingId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) return sendError(res, 401, "Unauthorized");

    const confirmedBooking = await BookingService.confirmBooking(
      bookingId as string,
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
    const { bookingId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) return sendError(res, 401, "Unauthorized");

    const cancelledBooking = await BookingService.cancelBooking(
      bookingId as string,
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

    const bookings = await BookingService.getUserBookings(userId);

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
    const { bookingId } = req.params;
    const booking = await BookingService.getBookingById(bookingId as string);

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
