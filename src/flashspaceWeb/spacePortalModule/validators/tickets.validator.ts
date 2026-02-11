import { Request, Response, NextFunction } from "express";

const allowedStatuses = [
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
];

const allowedPriorities = ["low", "medium", "high", "urgent"];

const normalize = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : "";

const isValidStatus = (value: unknown) =>
  typeof value === "string" && allowedStatuses.includes(normalize(value));

const isValidPriority = (value: unknown) =>
  typeof value === "string" && allowedPriorities.includes(normalize(value));

export const validateListTickets = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { status, priority, page, limit } = req.query;

  if (status !== undefined && !isValidStatus(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (priority !== undefined && !isValidPriority(priority)) {
    return res.status(400).json({ success: false, message: "Invalid priority" });
  }

  if (page !== undefined && Number.isNaN(Number(page))) {
    return res.status(400).json({ success: false, message: "Invalid page" });
  }

  if (limit !== undefined && Number.isNaN(Number(limit))) {
    return res.status(400).json({ success: false, message: "Invalid limit" });
  }

  next();
};

export const validateUpdateTicket = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { status, priority, assignedTo } = req.body;

  if (status !== undefined && !isValidStatus(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (priority !== undefined && !isValidPriority(priority)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid priority" });
  }

  if (assignedTo !== undefined && typeof assignedTo !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid assignedTo" });
  }

  next();
};
