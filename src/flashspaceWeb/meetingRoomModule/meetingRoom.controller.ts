import { Request, Response } from "express";
import { MeetingRoomService } from "./meetingRoom.service";
import {
  createMeetingRoomSchema,
  updateMeetingRoomSchema,
} from "./meetingRoom.validation";

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

    const MEETING_ROOM_DATA = validation.data.body;
    const partnerId = (req as any).user?.id;

    if (!partnerId)
      return sendError(res, 401, "Unauthorized: No partner found");

    const createdRoom = await MeetingRoomService.createRoom(
      MEETING_ROOM_DATA,
      partnerId,
    );

    res.status(201).json({
      success: true,
      message: "Meeting room created successfully",
      data: createdRoom,
    });
  } catch (err) {
    sendError(res, 500, "Failed to create meeting room", err);
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

    const updatedRoom = await MeetingRoomService.updateRoom(
      meetingRoomId,
      validation.data.body,
      userId,
      userRole, // <--- ADDED: Pass to service
    );

    res.status(200).json({
      success: true,
      message: "Meeting room updated successfully",
      data: updatedRoom,
    });
  } catch (err: any) {
    if (err.message === "Meeting room not found or unauthorized")
      return sendError(res, 404, err.message);
    sendError(res, 500, "Update failed", err);
  }
};

export const getAllMeetingRooms = async (req: Request, res: Response) => {
  try {
    const { deleted, type, minPrice, maxPrice } = req.query;
    const query: any = String(deleted) === "true" ? { isDeleted: true } : {};

    if (type) query.type = type;

    if (minPrice || maxPrice) {
      query.pricePerHour = {};
      if (minPrice) query.pricePerHour.$gte = Number(minPrice);
      if (maxPrice) query.pricePerHour.$lte = Number(maxPrice);
    }

    const rooms = await MeetingRoomService.getRooms(query);

    if (rooms.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "No meeting rooms found", data: [] });
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Meeting rooms retrieved successfully",
        data: rooms,
      });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve meeting rooms", err);
  }
};

export const getMeetingRoomById = async (req: Request, res: Response) => {
  try {
    const { meetingRoomId } = req.params;
    const room = await MeetingRoomService.getRoomById(meetingRoomId as string);

    if (!room) return sendError(res, 404, "Meeting room not found");

    res
      .status(200)
      .json({
        success: true,
        message: "Meeting room retrieved successfully",
        data: room,
      });
  } catch (err: any) {
    if (err.kind === "ObjectId")
      return sendError(res, 400, "Invalid ID format");
    sendError(res, 500, "Failed to retrieve meeting room", err);
  }
};

export const getMeetingRoomsByCity = async (req: Request, res: Response) => {
  try {
    const { city } = req.params;
    const { type, minPrice, maxPrice } = req.query;

    const query: any = { city: new RegExp(`^${city}$`, "i") };

    if (type) query.type = type;

    if (minPrice || maxPrice) {
      query.pricePerHour = {};
      if (minPrice) query.pricePerHour.$gte = Number(minPrice);
      if (maxPrice) query.pricePerHour.$lte = Number(maxPrice);
    }

    const rooms = await MeetingRoomService.getRooms(query);

    if (rooms.length === 0) {
      return res
        .status(200)
        .json({
          success: true,
          message: `No meeting rooms found in ${city}`,
          data: [],
        });
    }

    res
      .status(200)
      .json({
        success: true,
        message: `Meeting rooms in ${city} retrieved successfully`,
        data: rooms,
      });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve rooms by city", err);
  }
};

export const getPartnerMeetingRooms = async (req: Request, res: Response) => {
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

    const rooms = await MeetingRoomService.getRooms(query);

    res
      .status(200)
      .json({
        success: true,
        message: "Partner meeting rooms retrieved successfully",
        data: rooms,
      });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve partner meeting rooms", err);
  }
};

export const deleteMeetingRoom = async (req: Request, res: Response) => {
  try {
    const { meetingRoomId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role; // <--- ADDED: Extract role

    if (!userId) return sendError(res, 401, "Unauthorized");

    await MeetingRoomService.deleteRoom(
      meetingRoomId as string,
      userId,
      userRole,
    ); // <--- ADDED: Pass to service

    res
      .status(200)
      .json({
        success: true,
        message: "Meeting room deleted successfully",
        data: {},
      });
  } catch (err: any) {
    if (err.message === "Meeting room not found or unauthorized")
      return sendError(res, 404, err.message);
    sendError(res, 500, "Failed to delete meeting room", err);
  }
};
