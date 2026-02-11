import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";

export const validateClientDetails = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { clientId } = req.params;

  if (!Types.ObjectId.isValid(clientId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid client ID format" });
  }

  next();
};
