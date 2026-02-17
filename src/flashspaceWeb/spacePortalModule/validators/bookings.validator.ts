import { Request, Response, NextFunction } from "express";
import { BookingRequestStatus } from "../models/bookingRequest.model";

const isValidStatus = (value: unknown) =>
  Object.values(BookingRequestStatus).includes(value as BookingRequestStatus);

export const validateListBookings = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { fromDate, toDate, page, limit } = req.query;

  if (fromDate && Number.isNaN(new Date(fromDate as string).getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid fromDate" });
  }

  if (toDate && Number.isNaN(new Date(toDate as string).getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid toDate" });
  }

  if (page !== undefined && Number.isNaN(Number(page))) {
    return res.status(400).json({ success: false, message: "Invalid page" });
  }

  if (limit !== undefined && Number.isNaN(Number(limit))) {
    return res.status(400).json({ success: false, message: "Invalid limit" });
  }

  next();
};

export const validateCreateBooking = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { clientName, space, startTime, endTime, status, planName, amount } = req.body;
  const allowedStatuses = ["CONFIRMED", "PENDING", "CANCELLED"];

  if (!clientName || typeof clientName !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "clientName is required" });
  }

  if (!space || typeof space !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "space is required" });
  }

  if (!startTime || Number.isNaN(new Date(startTime).getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid startTime" });
  }

  if (!endTime || Number.isNaN(new Date(endTime).getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid endTime" });
  }

  if (!status || typeof status !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "status is required" });
  }

  if (!allowedStatuses.includes(status)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid status" });
  }

  if (planName !== undefined && typeof planName !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid planName" });
  }

  if (amount !== undefined && typeof amount !== "number") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid amount" });
  }

  next();
};

export const validateListBookingRequests = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { status, page, limit } = req.query;

  if (status !== undefined && !isValidStatus(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (page !== undefined && Number.isNaN(Number(page))) {
    return res.status(400).json({ success: false, message: "Invalid page" });
  }

  if (limit !== undefined && Number.isNaN(Number(limit))) {
    return res.status(400).json({ success: false, message: "Invalid limit" });
  }

  next();
};

export const validateCreateBookingRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { clientName, space, requestedDate, requestedTime } = req.body;

  if (!clientName || typeof clientName !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "clientName is required" });
  }

  if (!space || typeof space !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "space is required" });
  }

  if (!requestedDate || Number.isNaN(new Date(requestedDate).getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid requestedDate" });
  }

  if (!requestedTime || typeof requestedTime !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "requestedTime is required" });
  }

  next();
};

export const validateUpdateBookingRequestStatus = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { status } = req.body;

  if (!isValidStatus(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  next();
};
