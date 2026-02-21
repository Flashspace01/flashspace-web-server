import { Request, Response } from "express";
import { CoworkingSpaceService } from "./coworkingSpace.service";
import {
  createCoworkingSpaceSchema,
  updateCoworkingSpaceSchema,
} from "./coworkingSpace.validation";

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

export const createCoworkingSpace = async (req: Request, res: Response) => {
  try {
    const validation = createCoworkingSpaceSchema.safeParse(req);
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

    const {
      name,
      address,
      city,
      area,
      capacity,
      inventory,
      operatingHours,
      amenities,
      location,
      images,
      popular,
    } = validation.data.body;

    const partnerId = (req as any).user?.id;
    if (!partnerId)
      return sendError(res, 401, "Unauthorized: No partner found");

    const createdSpace = await CoworkingSpaceService.createSpace(
      {
        name,
        address,
        city,
        area,
        capacity,
        inventory,
        operatingHours,
        amenities,
        location,
        images,
        popular,
      },
      partnerId,
    );

    res.status(201).json({
      success: true,
      message: "Coworking space created successfully",
      data: createdSpace,
    });
  } catch (err) {
    sendError(res, 500, "Failed to create space", err);
  }
};

export const updateCoworkingSpace = async (req: Request, res: Response) => {
  try {
    const validation = updateCoworkingSpaceSchema.safeParse(req);
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

    const { coworkingSpaceId } = validation.data.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const updatedSpace = await CoworkingSpaceService.updateSpace(
      coworkingSpaceId,
      validation.data.body,
      userId,
      userRole,
    );

    res.status(200).json({
      success: true,
      message: "Updated successfully",
      data: updatedSpace,
    });
  } catch (err: any) {
    if (err.message === "Space not found or unauthorized")
      return sendError(res, 404, err.message);
    if (err.message.startsWith("Unauthorized"))
      return sendError(res, 403, err.message);
    sendError(res, 500, "Update failed", err);
  }
};

export const getAllCoworkingSpaces = async (req: Request, res: Response) => {
  try {
    const { deleted } = req.query;
    const query: any = String(deleted) === "true" ? { isDeleted: true } : {};
    const spaces = await CoworkingSpaceService.getSpaces(query);

    if (spaces.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No coworking spaces found",
        data: [],
        error: {},
      });
    }
    res.status(200).json({
      success: true,
      message: "Coworking spaces retrieved successfully",
      data: spaces,
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve spaces", err);
  }
};

export const getCoworkingSpaceById = async (req: Request, res: Response) => {
  try {
    const { coworkingSpaceId } = req.params;
    const space = await CoworkingSpaceService.getSpaceById(
      coworkingSpaceId as string,
    );
    if (!space) return sendError(res, 404, "Coworking space not found");
    res.status(200).json({
      success: true,
      message: "Coworking space retrieved successfully",
      data: space,
    });
  } catch (err: any) {
    if (err.message === "Invalid ID format")
      return sendError(res, 400, err.message);
    sendError(res, 500, "Failed to retrieve space", err);
  }
};

export const getCoworkingSpacesByCity = async (req: Request, res: Response) => {
  try {
    const { city } = req.params;
    const spaces = await CoworkingSpaceService.getSpaces({
      city: new RegExp(`^${city}$`, "i"),
    });

    if (spaces.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No coworking spaces found in ${city}`,
        data: [],
        error: {},
      });
    }
    res.status(200).json({
      success: true,
      message: `Coworking spaces in ${city} retrieved successfully`,
      data: spaces,
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve spaces by city", err);
  }
};

export const getPartnerSpaces = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const spaces = await CoworkingSpaceService.getSpaces({
      $or: [{ partner: userId }, { managers: userId }],
    });
    res.status(200).json({
      success: true,
      message: "Partner spaces retrieved successfully",
      data: spaces,
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve partner spaces", err);
  }
};

export const deleteCoworkingSpace = async (req: Request, res: Response) => {
  try {
    const { coworkingSpaceId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) return sendError(res, 401, "Unauthorized");

    await CoworkingSpaceService.deleteSpace(coworkingSpaceId as string, userId, userRole);
    res.status(200).json({
      success: true,
      message: "Coworking space deleted successfully",
      data: {},
    });
  } catch (err: any) {
    if (err.message === "Space not found or unauthorized")
      return sendError(res, 404, err.message);
    sendError(res, 500, "Failed to delete space", err);
  }
};