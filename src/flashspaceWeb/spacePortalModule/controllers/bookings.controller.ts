import { Request, Response } from "express";
import { SpacePortalBookingsService } from "../services/bookings.service";
import { BookingRequestStatus } from "../models/bookingRequest.model";

const bookingsService = new SpacePortalBookingsService();

export const getBookings = async (req: Request, res: Response) => {
  const { spaceId, fromDate, toDate, page, limit } = req.query;

  const result = await bookingsService.getBookings({
    spaceId: spaceId as string | undefined,
    fromDate: fromDate ? new Date(fromDate as string) : undefined,
    toDate: toDate ? new Date(toDate as string) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.status(result.success ? 200 : 400).json(result);
};

export const createBooking = async (req: Request, res: Response) => {
  const result = await bookingsService.createBooking(req.body);
  res.status(result.success ? 201 : 400).json(result);
};

export const getBookingRequests = async (req: Request, res: Response) => {
  const { status, page, limit } = req.query;

  const result = await bookingsService.getBookingRequests({
    status: status as BookingRequestStatus | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.status(result.success ? 200 : 400).json(result);
};

export const createBookingRequest = async (req: Request, res: Response) => {
  const result = await bookingsService.createBookingRequest(req.body);
  res.status(result.success ? 201 : 400).json(result);
};

export const updateBookingRequestStatus = async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { status } = req.body as { status: BookingRequestStatus };

  const result = await bookingsService.updateRequestStatus(requestId, status);
  res.status(result.success ? 200 : 400).json(result);
};
