import { Request, Response } from "express";
import { MeetingRoomService } from "./meetingRoom.service";
import { flattenProperty } from "../propertyModule/property.service";
import {
  createMeetingRoomSchema,
  updateMeetingRoomSchema,
  getMeetingRoomsSchema,
  getMeetingRoomByIdSchema,
  getMeetingRoomsByCitySchema,
} from "./meetingRoom.validation";
import { UserRole } from "../authModule/models/user.model";
import { SpaceApprovalStatus } from "../shared/enums/spaceApproval.enum";
import { assertPartnerKycApproved } from "../shared/utils/partnerKyc.utils";

// --- HELPERS ---
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

export const createMeetingRoom = async (req: Request, res: Response) => {
  try {
    const validation = createMeetingRoomSchema.safeParse(req);
    if (!validation.success) {
      console.error(
        "Meeting Room Validation Error:",
        JSON.stringify(validation.error.issues, null, 2),
      );
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        data: {},
        error: validation.error.issues.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      });
    }

    const MEETING_ROOM_DATA: any = {
      ...validation.data.body,
      propertyId: (req.body as any).propertyId,
    };

    // Data already contains partnerPricePerHour/partnerPricePerDay from validation schema

    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId)
      return sendError(res, 401, "Unauthorized: No partner found");

    // If admin is creating, they can specify a partner in the body
    let partnerId = userId;
    if (userRole === "admin" && req.body.partner) {
      partnerId = req.body.partner;
    } else if (userRole === "admin" && req.body.partnerId) {
      partnerId = req.body.partnerId;
    }

    const canCreateWithoutPartnerKyc =
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.SPACE_PARTNER_MANAGER;

    // If admin is creating, auto-approve
    if (canCreateWithoutPartnerKyc) {
      MEETING_ROOM_DATA.approvalStatus = SpaceApprovalStatus.ACTIVE;
      MEETING_ROOM_DATA.isActive = true;
    } else {
      try {
        await assertPartnerKycApproved(partnerId);
      } catch (err: any) {
        return sendError(
          res,
          403,
          err?.message ||
            "Personal KYC must be approved before adding a new space.",
        );
      }
    }

    const createdRoom = await MeetingRoomService.createRoom(
      MEETING_ROOM_DATA,
      partnerId,
    );

    res.status(201).json({
      success: true,
      message: "Meeting room created successfully",
      data: flattenProperty(createdRoom),
    });
  } catch (err: any) {
    sendError(res, 500, "Failed to create meeting room", err);
  }
};

export const bulkSaveMeetingRooms = async (req: Request, res: Response) => {
  try {
    const { propertyId, rooms } = req.body;
    const partnerId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!partnerId) {
      return sendError(res, 401, "Unauthorized: No partner found");
    }

    if (!propertyId || !Array.isArray(rooms)) {
      return sendError(
        res,
        400,
        "Validation Error: propertyId and rooms array are required.",
      );
    }

    const canCreateWithoutPartnerKyc =
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.SPACE_PARTNER_MANAGER;

    if (!canCreateWithoutPartnerKyc) {
      try {
        await assertPartnerKycApproved(partnerId);
      } catch (err: any) {
        return sendError(
          res,
          403,
          err?.message ||
            "Personal KYC must be approved before adding a new space.",
        );
      }
    }

    const savedRooms = await MeetingRoomService.bulkSaveRooms(
      propertyId,
      rooms,
      partnerId,
    );

    res.status(200).json({
      success: true,
      message: "Meeting rooms bulk saved successfully",
      data: savedRooms.map(flattenProperty),
    });
  } catch (err: any) {
    if (err.message === "Property not found or unauthorized") {
      return sendError(res, 404, err.message);
    }
    sendError(res, 500, "Failed to bulk save meeting rooms", err);
  }
};

export const updateMeetingRoom = async (req: Request, res: Response) => {
  try {
    const validation = updateMeetingRoomSchema.safeParse(req);
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

    const { meetingRoomId } = validation.data.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role; // <--- ADDED: Extract role

    if (!userId) return sendError(res, 401, "Unauthorized");

    const updateData: any = { ...validation.data.body };
    if (updateData.pricePerHour)
      updateData.partnerPricePerHour = updateData.pricePerHour;
    if (updateData.pricePerDay)
      updateData.partnerPricePerDay = updateData.pricePerDay;

    const updatedRoom = await MeetingRoomService.updateRoom(
      meetingRoomId,
      updateData,
      userId,
      userRole, // <--- ADDED: Pass to service
    );

    res.status(200).json({
      success: true,
      message: "Meeting room updated successfully",
      data: flattenProperty(updatedRoom),
    });
  } catch (err: any) {
    if (err.message === "Meeting room not found or unauthorized")
      return sendError(res, 404, err.message);
    sendError(res, 500, "Update failed", err);
  }
};

export const getAllMeetingRooms = async (req: Request, res: Response) => {
  try {
    const validation = getMeetingRoomsSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error);
    }

    const { deleted, type, minPrice, maxPrice, limit, property, city, name, area } =
      validation.data.query;
    const query: any =
      String(deleted) === "true"
        ? { isDeleted: true }
        : {
            isDeleted: false,
            isActive: true,
            approvalStatus: SpaceApprovalStatus.ACTIVE,
          };

    if (property) {
      query.property = property;
    }

    if (city) query.city = new RegExp(`^${city}$`, "i");
    if (name) query.name = new RegExp(name, "i");
    if (area) query.area = area;

    if (type) query.type = type;

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.pricePerHour = {};
      if (minPrice !== undefined) query.pricePerHour.$gte = minPrice;
      if (maxPrice !== undefined) query.pricePerHour.$lte = maxPrice;
    }

    const _limit = limit ? Math.min(limit, 100) : 100;
    const rooms = await MeetingRoomService.getRooms(query, _limit);

    if (rooms.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "No meeting rooms found", data: [] });
    }

    res.status(200).json({
      success: true,
      message: "Meeting rooms retrieved successfully",
      data: rooms.map(flattenProperty),
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve meeting rooms", err);
  }
};

export const getMeetingRoomById = async (req: Request, res: Response) => {
  try {
    const validation = getMeetingRoomByIdSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error);
    }

    const { meetingRoomId } = validation.data.params;
    const room = await MeetingRoomService.getRoomById(meetingRoomId);

    if (!room) return sendError(res, 404, "Meeting room not found");

    const isPublished =
      room.isActive && room.approvalStatus === SpaceApprovalStatus.ACTIVE;

    if (!isPublished) {
      const user = (req as any).user;
      const isPartner = user && user.id && room.partner.toString() === user.id;
      const isAdmin = user && user.role === UserRole.ADMIN;

      if (!isPartner && !isAdmin) {
        return sendError(res, 404, "Meeting room not found");
      }
    }

    res.status(200).json({
      success: true,
      message: "Meeting room retrieved successfully",
      data: flattenProperty(room),
    });
  } catch (err: any) {
    sendError(res, 500, "Failed to retrieve meeting room", err);
  }
};

export const getMeetingRoomsByCity = async (req: Request, res: Response) => {
  try {
    const validation = getMeetingRoomsByCitySchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error);
    }

    const { city } = validation.data.params;
    const { type, minPrice, maxPrice, limit } = validation.data.query;

    const query: any = {
      city: new RegExp(`^${city}$`, "i"),
      isActive: true,
      isDeleted: false,
      approvalStatus: SpaceApprovalStatus.ACTIVE,
    };

    if (type) query.type = type;

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.pricePerHour = {};
      if (minPrice !== undefined) query.pricePerHour.$gte = minPrice;
      if (maxPrice !== undefined) query.pricePerHour.$lte = maxPrice;
    }

    const _limit = limit ? Math.min(limit, 100) : 100;
    const rooms = await MeetingRoomService.getRooms(query, _limit);

    if (rooms.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No meeting rooms found in ${city}`,
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: `Meeting rooms in ${city} retrieved successfully`,
      data: rooms.map(flattenProperty),
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve rooms by city", err);
  }
};

export const getPartnerMeetingRooms = async (req: Request, res: Response) => {
  try {
    const validation = getMeetingRoomsSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error);
    }

    const userId = (req as any).user.id;
    const { type, minPrice, maxPrice, limit } = validation.data.query;

    const query: any = { partner: userId };

    if (type) query.type = type;

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.pricePerHour = {};
      if (minPrice !== undefined) query.pricePerHour.$gte = minPrice;
      if (maxPrice !== undefined) query.pricePerHour.$lte = maxPrice;
    }

    const _limit = limit ? Math.min(limit, 100) : 100;
    const rooms = await MeetingRoomService.getRooms(query, _limit);

    res.status(200).json({
      success: true,
      message: "Partner meeting rooms retrieved successfully",
      data: rooms.map(flattenProperty),
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve partner meeting rooms", err);
  }
};

export const deleteMeetingRoom = async (req: Request, res: Response) => {
  try {
    const { meetingRoomId } = req.params;
    const { restore } = req.query;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role; // <--- ADDED: Extract role
    const isRestoring = String(restore) === "true";

    if (!userId) return sendError(res, 401, "Unauthorized");

    await MeetingRoomService.deleteRoom(
      meetingRoomId as string,
      userId,
      userRole,
      isRestoring,
    ); // <--- ADDED: Pass to service

    res.status(200).json({
      success: true,
      message: isRestoring
        ? "Meeting room restored successfully"
        : "Meeting room deleted successfully",
      data: {},
    });
  } catch (err: any) {
    if (err.message === "Meeting room not found or unauthorized")
      return sendError(res, 404, err.message);
    sendError(res, 500, "Failed to delete meeting room", err);
  }
};
