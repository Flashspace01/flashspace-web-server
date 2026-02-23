import { Request, Response } from "express";
import { VirtualOfficeService } from "./virtualOffice.service";
import {
  createVirtualOfficeSchema,
  updateVirtualOfficeSchema,
} from "./virtualOffice.validation";
import { UserRole } from "../authModule/models/user.model";

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

export const createVirtualOffice = async (req: Request, res: Response) => {
  try {
    const validation = createVirtualOfficeSchema.safeParse(req);
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

    const createdOffice = await VirtualOfficeService.createOffice(
      validation.data.body,
      partnerId,
    );

    res
      .status(201)
      .json({
        success: true,
        message: "Virtual office created successfully",
        data: createdOffice,
      });
  } catch (err) {
    sendError(res, 500, "Failed to create virtual office", err);
  }
};

export const updateVirtualOffice = async (req: Request, res: Response) => {
  try {
    const validation = updateVirtualOfficeSchema.safeParse(req);
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

    const { virtualOfficeId } = validation.data.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) return sendError(res, 401, "Unauthorized");

    const updatedOffice = await VirtualOfficeService.updateOffice(
      virtualOfficeId,
      validation.data.body,
      userId,
      userRole,
    );

    res
      .status(200)
      .json({
        success: true,
        message: "Virtual office updated successfully",
        data: updatedOffice,
      });
  } catch (err: any) {
    if (err.message === "Virtual office not found or unauthorized")
      return sendError(res, 404, err.message);
    sendError(res, 500, "Update failed", err);
  }
};

export const getAllVirtualOffices = async (req: Request, res: Response) => {
  try {
    const { deleted } = req.query;
    const query: any = String(deleted) === "true" ? { isDeleted: true } : {};

    const offices = await VirtualOfficeService.getOffices(query);

    if (offices.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "No virtual offices found", data: [] });
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Virtual offices retrieved successfully",
        data: offices,
      });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve virtual offices", err);
  }
};

export const getVirtualOfficeById = async (req: Request, res: Response) => {
  try {
    const { virtualOfficeId } = req.params;
    const office = await VirtualOfficeService.getOfficeById(
      virtualOfficeId as string,
    );

    if (!office) return sendError(res, 404, "Virtual office not found");

    res
      .status(200)
      .json({
        success: true,
        message: "Virtual office retrieved successfully",
        data: office,
      });
  } catch (err: any) {
    if (err.kind === "ObjectId")
      return sendError(res, 400, "Invalid ID format");
    sendError(res, 500, "Failed to retrieve virtual office", err);
  }
};

export const getVirtualOfficesByCity = async (req: Request, res: Response) => {
  try {
    const { city } = req.params;
    const offices = await VirtualOfficeService.getOffices({
      city: new RegExp(`^${city}$`, "i"),
    });

    if (offices.length === 0) {
      return res
        .status(200)
        .json({
          success: true,
          message: `No virtual offices found in ${city}`,
          data: [],
        });
    }

    res
      .status(200)
      .json({
        success: true,
        message: `Virtual offices in ${city} retrieved successfully`,
        data: offices,
      });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve offices by city", err);
  }
};

export const getPartnerVirtualOffices = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const offices = await VirtualOfficeService.getOffices({ partner: userId });

    const formattedSpaces = offices.map((space) => {
      const s = space.toObject ? space.toObject() : space;
      return { ...s, type: "Virtual Office", images: s.images || [] };
    });

    res
      .status(200)
      .json({
        success: true,
        message: "Partner virtual offices retrieved",
        data: formattedSpaces,
      });
  } catch (err) {
    sendError(res, 500, "Failed to fetch partner virtual offices", err);
  }
};

export const deleteVirtualOffice = async (req: Request, res: Response) => {
  try {
    const { virtualOfficeId } = req.params;
    const { restore } = req.query;

    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const isRestoring = String(restore) === "true";

    if (!userId) return sendError(res, 401, "Unauthorized");

    await VirtualOfficeService.deleteOffice(
      virtualOfficeId as string,
      userId,
      userRole,
      isRestoring,
    );

    res.status(200).json({
      success: true,
      message: isRestoring
        ? "Virtual office restored successfully"
        : "Virtual office deleted successfully",
      data: {},
    });
  } catch (err: any) {
    if (err.message === "Virtual office not found or unauthorized")
      return sendError(res, 404, err.message);
    sendError(res, 500, "Failed to delete virtual office", err);
  }
};
