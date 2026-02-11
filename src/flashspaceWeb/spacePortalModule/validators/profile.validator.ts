import { Request, Response, NextFunction } from "express";

const isNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

export const validateUpdateProfile = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { company, location } = req.body;

  if (company !== undefined && !isNonEmptyString(company)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid company" });
  }

  if (location !== undefined && !isNonEmptyString(location)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid location" });
  }

  next();
};
