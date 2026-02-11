import { Request, Response, NextFunction } from "express";
import { EnquiryStatus } from "../models/enquiry.model";

const isNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

const isValidStatus = (value: unknown) =>
  Object.values(EnquiryStatus).includes(value as EnquiryStatus);

export const validateCreateEnquiry = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    clientName,
    companyName,
    phone,
    email,
    requestedPlan,
    requestedSpace,
  } = req.body;

  if (!isNonEmptyString(clientName) || !isNonEmptyString(companyName)) {
    return res
      .status(400)
      .json({ success: false, message: "Client and company name are required" });
  }

  if (!isNonEmptyString(phone) || !isNonEmptyString(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Phone and email are required" });
  }

  if (!isNonEmptyString(requestedPlan) || !isNonEmptyString(requestedSpace)) {
    return res.status(400).json({
      success: false,
      message: "Requested plan and space are required",
    });
  }

  next();
};

export const validateUpdateEnquiry = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { status } = req.body;

  if (status !== undefined && !isValidStatus(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  next();
};

export const validateUpdateEnquiryStatus = (
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

export const validateListEnquiries = (
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
