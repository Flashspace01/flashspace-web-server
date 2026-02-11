import { Request, Response, NextFunction } from "express";
import { SpacePortalSpaceStatus } from "../models/space.model";

const isNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

const isNumber = (value: unknown) =>
  typeof value === "number" && !Number.isNaN(value);

const isValidStatus = (value: unknown) =>
  Object.values(SpacePortalSpaceStatus).includes(
    value as SpacePortalSpaceStatus
  );

export const validateCreateSpace = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    name,
    city,
    location,
    totalSeats,
    availableSeats,
    meetingRooms,
    cabins,
    status,
  } = req.body;

  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(city) ||
    !isNonEmptyString(location)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Name, city, and location are required" });
  }

  if (
    !isNumber(totalSeats) ||
    !isNumber(availableSeats) ||
    !isNumber(meetingRooms) ||
    !isNumber(cabins)
  ) {
    return res.status(400).json({
      success: false,
      message: "Seat counts and room counts must be numbers",
    });
  }

  if (totalSeats < 0 || availableSeats < 0 || meetingRooms < 0 || cabins < 0) {
    return res.status(400).json({
      success: false,
      message: "Counts must be zero or greater",
    });
  }

  if (availableSeats > totalSeats) {
    return res.status(400).json({
      success: false,
      message: "Available seats cannot exceed total seats",
    });
  }

  if (!isValidStatus(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status",
    });
  }

  next();
};

export const validateUpdateSpace = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    name,
    city,
    location,
    totalSeats,
    availableSeats,
    meetingRooms,
    cabins,
    status,
  } = req.body;

  if (name !== undefined && !isNonEmptyString(name)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid name" });
  }

  if (city !== undefined && !isNonEmptyString(city)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid city" });
  }

  if (location !== undefined && !isNonEmptyString(location)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid location" });
  }

  if (totalSeats !== undefined && !isNumber(totalSeats)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid totalSeats" });
  }

  if (availableSeats !== undefined && !isNumber(availableSeats)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid availableSeats" });
  }

  if (meetingRooms !== undefined && !isNumber(meetingRooms)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid meetingRooms" });
  }

  if (cabins !== undefined && !isNumber(cabins)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid cabins" });
  }

  if (
    totalSeats !== undefined &&
    availableSeats !== undefined &&
    isNumber(totalSeats) &&
    isNumber(availableSeats) &&
    availableSeats > totalSeats
  ) {
    return res.status(400).json({
      success: false,
      message: "Available seats cannot exceed total seats",
    });
  }

  if (status !== undefined && !isValidStatus(status)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid status" });
  }

  next();
};

export const validateListSpaces = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { status, page, limit } = req.query;

  if (status !== undefined && !isValidStatus(status)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid status" });
  }

  if (page !== undefined && Number.isNaN(Number(page))) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid page" });
  }

  if (limit !== undefined && Number.isNaN(Number(limit))) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid limit" });
  }

  next();
};
