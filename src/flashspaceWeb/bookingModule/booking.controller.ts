import { Request, Response } from "express";
import { BookingService } from "./booking.service";
import {
  toggleAutoRenewSchema,
  linkProfileSchema,
  getPartnerBookingsSchema,
  getBookingByIdSchema,
  getBookingsByPropertySchema,
} from "./booking.validation";
import { getAllBookingsSchema } from "./booking.validation";

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

export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const validation = getAllBookingsSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error);
    }

    const userId = req.user?.id;
    const { type, status, page, limit } = validation.data.query;

    const data = await BookingService.getAllBookings(
      userId as string,
      type,
      status,
      page || 1,
      limit || 10,
    );

    res.status(200).json({ success: true, ...data });
  } catch (error) {
    sendError(res, 500, "Failed to fetch bookings", error);
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const validation = getBookingByIdSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error);
    }

    const userId = req.user?.id;
    const { bookingId } = validation.data.params;

    const booking = await BookingService.getBookingById(
      userId as string,
      bookingId as string,
    );
    if (!booking) return sendError(res, 404, "Booking not found");

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    sendError(res, 500, "Failed to fetch booking", error);
  }
};

export const getBookingsByProperty = async (req: Request, res: Response) => {
  try {
    const validation = getBookingsByPropertySchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error);
    }

    const userId = req.user?.id;
    const { spaceId } = validation.data.params;
    const { year, month } = validation.data.query;

    const bookings = await BookingService.getBookingsByProperty(
      userId as string,
      spaceId as string,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    sendError(res, 500, "Failed to fetch bookings for this property", error);
  }
};

export const toggleAutoRenew = async (req: Request, res: Response) => {
  try {
    const validation = toggleAutoRenewSchema.safeParse(req);
    if (!validation.success)
      return sendError(res, 400, "Validation Error", validation.error);

    const userId = req.user?.id;
    const { bookingId } = validation.data.params;
    const { autoRenew } = validation.data.body;

    const booking = await BookingService.toggleAutoRenew(
      userId as string,
      bookingId,
      autoRenew,
    );
    if (!booking) return sendError(res, 404, "Booking not found");

    res.status(200).json({
      success: true,
      message: `Auto-renewal ${autoRenew ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    sendError(res, 500, "Failed to update auto-renewal", error);
  }
};

export const linkBookingToProfile = async (req: Request, res: Response) => {
  try {
    const validation = linkProfileSchema.safeParse(req);
    if (!validation.success)
      return sendError(res, 400, "Validation Error", validation.error);

    const userId = req.user?.id;
    const { bookingId } = validation.data.params;
    const { profileId } = validation.data.body;

    const booking = await BookingService.linkBookingToProfile(
      userId as string,
      bookingId,
      profileId,
    );

    res.status(200).json({
      success: true,
      message: "Booking linked to profile successfully",
      data: booking,
    });
  } catch (error: any) {
    if (
      error.message === "Profile not found" ||
      error.message === "Booking not found"
    ) {
      return sendError(res, 404, error.message);
    }
    sendError(res, 400, error.message, error);
  }
};

export const getPartnerSpaceBookings = async (req: Request, res: Response) => {
  try {
    const validation = getPartnerBookingsSchema.safeParse(req);
    if (!validation.success)
      return sendError(res, 400, "Validation Error", validation.error);

    const userId = req.user?.id;
    const { spaceId } = validation.data.params;
    const { month, year } = validation.data.query;

    const bookings = await BookingService.getPartnerSpaceBookings(
      userId as string,
      spaceId,
      month,
      year,
    );

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    sendError(res, 500, "Failed to fetch bookings", error);
  }
};

export const getPartnerDashboardOverview = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const clients = await BookingService.getPartnerDashboardOverview(
      userId as string,
    );
    res.status(200).json({ success: true, data: { clients } });
  } catch (err) {
    sendError(res, 500, "Failed to fetch partner dashboard data", err);
  }
};
