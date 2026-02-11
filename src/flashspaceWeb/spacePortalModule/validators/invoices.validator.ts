import { Request, Response, NextFunction } from "express";

const allowedStatuses = ["paid", "pending", "overdue", "cancelled"];

const isValidStatus = (value: unknown) =>
  typeof value === "string" && allowedStatuses.includes(value);

const isNumber = (value: unknown) =>
  typeof value === "number" && !Number.isNaN(value);

export const validateListInvoices = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { status, fromDate, toDate, page, limit } = req.query;

  if (status !== undefined && !isValidStatus(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

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

export const validateCreateInvoice = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { description, subtotal, total, taxRate, taxAmount } = req.body;

  if (typeof description !== "string" || description.trim().length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Description is required" });
  }

  if (!isNumber(subtotal) || !isNumber(total)) {
    return res
      .status(400)
      .json({ success: false, message: "Subtotal and total are required" });
  }

  if (taxRate !== undefined && !isNumber(taxRate)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid taxRate" });
  }

  if (taxAmount !== undefined && !isNumber(taxAmount)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid taxAmount" });
  }

  next();
};
