import { Request, Response, NextFunction } from "express";
import { ClientPlan, ClientStatus, KycStatus } from "../models/client.model";

const isNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

const isValidPlan = (value: unknown) =>
  Object.values(ClientPlan).includes(value as ClientPlan);

const isValidStatus = (value: unknown) =>
  Object.values(ClientStatus).includes(value as ClientStatus);

const isValidKycStatus = (value: unknown) =>
  Object.values(KycStatus).includes(value as KycStatus);

const isValidDate = (value: unknown) => {
  if (typeof value !== "string" && !(value instanceof Date)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

export const validateCreateClient = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    companyName,
    contactName,
    email,
    phone,
    plan,
    space,
    startDate,
    endDate,
    status,
    kycStatus,
  } = req.body;

  if (!isNonEmptyString(companyName) || !isNonEmptyString(contactName)) {
    return res
      .status(400)
      .json({ success: false, message: "Company and contact name are required" });
  }

  if (!isNonEmptyString(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  }

  if (!isNonEmptyString(phone)) {
    return res
      .status(400)
      .json({ success: false, message: "Phone is required" });
  }

  if (!isValidPlan(plan)) {
    return res.status(400).json({ success: false, message: "Invalid plan" });
  }

  if (!isNonEmptyString(space)) {
    return res.status(400).json({ success: false, message: "Space is required" });
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return res.status(400).json({
      success: false,
      message: "Invalid start or end date",
    });
  }

  if (!isValidStatus(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (!isValidKycStatus(kycStatus)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid KYC status" });
  }

  next();
};

export const validateUpdateClient = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    companyName,
    contactName,
    email,
    phone,
    plan,
    space,
    startDate,
    endDate,
    status,
    kycStatus,
  } = req.body;

  if (companyName !== undefined && !isNonEmptyString(companyName)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid company name" });
  }

  if (contactName !== undefined && !isNonEmptyString(contactName)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid contact name" });
  }

  if (email !== undefined && !isNonEmptyString(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email" });
  }

  if (phone !== undefined && !isNonEmptyString(phone)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid phone" });
  }

  if (plan !== undefined && !isValidPlan(plan)) {
    return res.status(400).json({ success: false, message: "Invalid plan" });
  }

  if (space !== undefined && !isNonEmptyString(space)) {
    return res.status(400).json({ success: false, message: "Invalid space" });
  }

  if (startDate !== undefined && !isValidDate(startDate)) {
    return res.status(400).json({
      success: false,
      message: "Invalid start date",
    });
  }

  if (endDate !== undefined && !isValidDate(endDate)) {
    return res.status(400).json({
      success: false,
      message: "Invalid end date",
    });
  }

  if (status !== undefined && !isValidStatus(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (kycStatus !== undefined && !isValidKycStatus(kycStatus)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid KYC status" });
  }

  next();
};

export const validateListClients = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { status, plan, kycStatus, page, limit } = req.query;

  if (status !== undefined && !isValidStatus(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (plan !== undefined && !isValidPlan(plan)) {
    return res.status(400).json({ success: false, message: "Invalid plan" });
  }

  if (kycStatus !== undefined && !isValidKycStatus(kycStatus)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid KYC status" });
  }

  if (page !== undefined && Number.isNaN(Number(page))) {
    return res.status(400).json({ success: false, message: "Invalid page" });
  }

  if (limit !== undefined && Number.isNaN(Number(limit))) {
    return res.status(400).json({ success: false, message: "Invalid limit" });
  }

  next();
};
