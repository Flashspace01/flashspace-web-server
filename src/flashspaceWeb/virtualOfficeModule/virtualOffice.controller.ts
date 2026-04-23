import { Request, Response } from "express";
import { VirtualOfficeService } from "./virtualOffice.service";
import { flattenProperty } from "../propertyModule/property.service";
import {
  createVirtualOfficeSchema,
  updateVirtualOfficeSchema,
  getVirtualOfficesSchema,
  getVirtualOfficeByIdSchema,
  getVirtualOfficesByCitySchema,
  getPartnerVirtualOfficesSchema,
} from "./virtualOffice.validation";
import { UserRole } from "../authModule/models/user.model";
import { SpaceApprovalStatus } from "../shared/enums/spaceApproval.enum";

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
    error: error,
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
    const userRole = (req as any).user?.role;
    if (!partnerId)
      return sendError(res, 401, "Unauthorized: No partner found");

    const createBody: any = validation.data.body;

    if (
      userRole !== UserRole.ADMIN &&
      (createBody.isActive === true || createBody.approvalStatus === "active")
    ) {
      return sendError(
        res,
        403,
        "Admin approval is required before publishing a virtual office.",
      );
    }

    const createdOffice = await VirtualOfficeService.createOffice(
      {
        ...validation.data.body,
        spaceId: (req.body as any).spaceId,
        propertyId: (req.body as any).propertyId,
      },
      partnerId,
    );

    res.status(201).json({
      success: true,
      message: "Virtual office created successfully",
      data: flattenProperty(createdOffice),
    });
  } catch (err: any) {
    console.error("VO Create Error:", err);
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

    res.status(200).json({
      success: true,
      message: "Virtual office updated successfully",
      data: flattenProperty(updatedOffice),
    });
  } catch (err: any) {
    if (err.message === "Virtual office not found or unauthorized")
      return sendError(res, 404, err.message);
    sendError(res, 500, "Update failed", err);
  }
};

export const getAllVirtualOffices = async (req: Request, res: Response) => {
  try {
    const validation = getVirtualOfficesSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error.issues);
    }

    const { deleted, limit, page, property } = validation.data.query;
    const _limit = limit ? Math.min(limit, 100) : 12; // paginate by default
    const _page = page ? Math.max(page, 1) : 1;

    const isDeleted = String(deleted) === "true";
    const query: any = { isDeleted };

    if (!isDeleted) {
      query.isActive = true;
      query.approvalStatus = SpaceApprovalStatus.ACTIVE;
    }

    if (property) {
      query.property = property;
    }

    const result = await VirtualOfficeService.getOffices(query, _limit, _page);

    res.status(200).json({
      success: true,
      message:
        result.offices.length === 0
          ? "No virtual offices found"
          : "Virtual offices retrieved successfully",
      data: result.offices.map(flattenProperty),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPrevPage: result.page > 1,
        nextPage: result.page < result.totalPages ? result.page + 1 : null,
        prevPage: result.page > 1 ? result.page - 1 : null,
      },
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve virtual offices", err);
  }
};

export const getVirtualOfficeById = async (req: Request, res: Response) => {
  try {
    const validation = getVirtualOfficeByIdSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error.issues);
    }

    const { virtualOfficeId } = validation.data.params;
    const office = await VirtualOfficeService.getOfficeById(virtualOfficeId);

    if (!office) return sendError(res, 404, "Virtual office not found");

    const isPublished =
      office.isActive && office.approvalStatus === SpaceApprovalStatus.ACTIVE;

    if (!isPublished) {
      const user = (req as any).user;
      const isPartner = user && user.id && office.partner.toString() === user.id;
      const isAdmin = user && user.role === UserRole.ADMIN;

      if (!isPartner && !isAdmin) {
        return sendError(
          res,
          404,
          "Virtual office not found",
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Virtual office retrieved successfully",
      data: flattenProperty(office),
    });
  } catch (err: any) {
    sendError(res, 500, "Failed to retrieve virtual office", err);
  }
};

export const getVirtualOfficesByCity = async (req: Request, res: Response) => {
  try {
    const validation = getVirtualOfficesByCitySchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error.issues);
    }

    const { city } = validation.data.params;
    const { limit, page } = validation.data.query;
    const _limit = limit ? Math.min(limit, 100) : 12;
    const _page = page ? Math.max(page, 1) : 1;

    const result = await VirtualOfficeService.getOffices(
      {
        city: new RegExp(`^${city}$`, "i"),
        isActive: true,
        isDeleted: false,
        approvalStatus: SpaceApprovalStatus.ACTIVE,
      },
      _limit,
      _page,
    );

    res.status(200).json({
      success: true,
      message:
        result.offices.length === 0
          ? `No virtual offices found in ${city}`
          : `Virtual offices in ${city} retrieved successfully`,
      data: {
        ...result,
        offices: result.offices.map(flattenProperty),
      },
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPrevPage: result.page > 1,
        nextPage: result.page < result.totalPages ? result.page + 1 : null,
        prevPage: result.page > 1 ? result.page - 1 : null,
      },
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve offices by city", err);
  }
};

export const getPartnerVirtualOffices = async (req: Request, res: Response) => {
  try {
    const validation = getPartnerVirtualOfficesSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error.issues);
    }

    const { limit, page } = validation.data.query;
    const _limit = limit ? Math.min(limit, 100) : 12;
    const _page = page ? Math.max(page, 1) : 1;

    const userId = (req as any).user?.id;
    const result = await VirtualOfficeService.getOffices(
      { partner: userId },
      _limit,
      _page,
    );

    const formattedSpaces = result.offices.map((space: any) => {
      const s = flattenProperty(space);
      return { ...s, type: "Virtual Office", images: s.images || [] };
    });

    res.status(200).json({
      success: true,
      message: "Partner virtual offices retrieved",
      data: {
        ...result,
        offices: formattedSpaces,
      },
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPrevPage: result.page > 1,
        nextPage: result.page < result.totalPages ? result.page + 1 : null,
        prevPage: result.page > 1 ? result.page - 1 : null,
      },
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
