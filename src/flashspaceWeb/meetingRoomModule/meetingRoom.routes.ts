import { Router } from "express";
import {
  createMeetingRoom,
  updateMeetingRoom,
  getAllMeetingRooms,
  getMeetingRoomById,
  getMeetingRoomsByCity,
  deleteMeetingRoom,
  getPartnerMeetingRooms,
  bulkSaveMeetingRooms,
  getUserMeetingRooms,
  getUserMeetingRoomById,
  getUserMeetingRoomsByCity,
} from "./meetingRoom.controller";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import { UserRole } from "../authModule/models/user.model";

const router = Router();

// Public Routes
router.get("/getAll", getAllMeetingRooms);
router.get("/getById/:meetingRoomId", getMeetingRoomById);
router.get("/getByCity/:city", getMeetingRoomsByCity);

// --- User-Facing Routes (Active Only) ---
router.get("/user/all", getUserMeetingRooms);
router.get("/user/id/:meetingRoomId", getUserMeetingRoomById);
router.get("/user/city/:city", getUserMeetingRoomsByCity);

router.post(
  "/create",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN),
  createMeetingRoom,
);
router.post(
  "/bulk-save",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN),
  bulkSaveMeetingRooms,
);
router.put(
  "/update/:meetingRoomId",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN),
  updateMeetingRoom,
);
router.delete(
  "/delete/:meetingRoomId",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN),
  deleteMeetingRoom,
);
router.get(
  "/partner/my-rooms",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER),
  getPartnerMeetingRooms,
);

export const meetingRoomRoutes = router;
