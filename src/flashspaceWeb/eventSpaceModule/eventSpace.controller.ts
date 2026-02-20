import { Request, Response } from "express";
import { EventSpaceService } from "./eventSpace.service";
import {
  createEventSpaceSchema,
  updateEventSpaceSchema,
} from "./eventSpace.validation";

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

export const createEventSpace = async (req: Request, res: Response) => {
  try {
    const validation = createEventSpaceSchema.safeParse(req);
    if (!validation.success) {
      return sendError(
        res,
        400,
        "Validation Error",
        validation.error.issues.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      );
    }

    const partnerId = (req as any).user?.id;
    if (!partnerId)
      return sendError(res, 401, "Unauthorized: No partner found");

    const createdSpace = await EventSpaceService.createSpace(
      validation.data.body,
      partnerId,
    );

    res.status(201).json({
      success: true,
      message: "Event space created successfully",
      data: createdSpace,
    });
  } catch (err) {
    sendError(res, 500, "Failed to create event space", err);
  }
};

export const updateEventSpace = async (req: Request, res: Response) => {
  try {
    const validation = updateEventSpaceSchema.safeParse(req);
    if (!validation.success) {
      return sendError(
        res,
        400,
        "Validation Error",
        validation.error.issues.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      );
    }

    const { eventSpaceId } = validation.data.params;
    const userId = (req as any).user?.id;
    if (!userId) return sendError(res, 401, "Unauthorized");

    const updatedSpace = await EventSpaceService.updateSpace(
      eventSpaceId,
      validation.data.body,
      userId,
    );

    res.status(200).json({
      success: true,
      message: "Event space updated successfully",
      data: updatedSpace,
    });
  } catch (err: any) {
    if (err.message === "Event space not found or unauthorized")
      return sendError(res, 404, err.message);
    sendError(res, 500, "Update failed", err);
  }
};

export const getAllEventSpaces = async (req: Request, res: Response) => {
  try {
    const { deleted, type, minPrice, maxPrice } = req.query;
    const query: any = String(deleted) === "true" ? { isDeleted: true } : {};

    if (type) {
      query.type = type;
    }

    if (minPrice || maxPrice) {
      query.pricePerHour = {};
      if (minPrice) query.pricePerHour.$gte = Number(minPrice);
      if (maxPrice) query.pricePerHour.$lte = Number(maxPrice);
    }

    const spaces = await EventSpaceService.getSpaces(query);

    if (spaces.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No event spaces found",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "Event spaces retrieved successfully",
      data: spaces,
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve event spaces", err);
  }
};

export const getEventSpaceById = async (req: Request, res: Response) => {
  try {
    const { eventSpaceId } = req.params;
    const space = await EventSpaceService.getSpaceById(eventSpaceId);

    if (!space) return sendError(res, 404, "Event space not found");

    res.status(200).json({
      success: true,
      message: "Event space retrieved successfully",
      data: space,
    });
  } catch (err: any) {
    if (err.kind === "ObjectId")
      return sendError(res, 400, "Invalid ID format");
    sendError(res, 500, "Failed to retrieve event space", err);
  }
};

export const getEventSpacesByCity = async (req: Request, res: Response) => {
  try {
    const { city } = req.params;
    const { type, minPrice, maxPrice } = req.query;

    const query: any = {
      city: new RegExp(`^${city}$`, "i"),
    };

    if (type) query.type = type;

    if (minPrice || maxPrice) {
      query.pricePerHour = {};
      if (minPrice) query.pricePerHour.$gte = Number(minPrice);
      if (maxPrice) query.pricePerHour.$lte = Number(maxPrice);
    }

    const spaces = await EventSpaceService.getSpaces(query);

    if (spaces.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No event spaces found in ${city}`,
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: `Event spaces in ${city} retrieved successfully`,
      data: spaces,
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve spaces by city", err);
  }
};

export const getPartnerEventSpaces = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { type, minPrice, maxPrice } = req.query;

    const query: any = { partner: userId };

    if (type) query.type = type;

    if (minPrice || maxPrice) {
      query.pricePerHour = {};
      if (minPrice) query.pricePerHour.$gte = Number(minPrice);
      if (maxPrice) query.pricePerHour.$lte = Number(maxPrice);
    }

    const spaces = await EventSpaceService.getSpaces(query);

    res.status(200).json({
      success: true,
      message: "Partner event spaces retrieved successfully",
      data: spaces,
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve partner event spaces", err);
  }
};

export const deleteEventSpace = async (req: Request, res: Response) => {
  try {
    const { eventSpaceId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) return sendError(res, 401, "Unauthorized");

    await EventSpaceService.deleteSpace(eventSpaceId, userId);

    res.status(200).json({
      success: true,
      message: "Event space deleted successfully",
      data: {},
    });
  } catch (err: any) {
    if (err.message === "Event space not found or unauthorized")
      return sendError(res, 404, err.message);
    sendError(res, 500, "Failed to delete event space", err);
  }
};
