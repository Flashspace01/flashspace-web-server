
import { Router } from "express";
import { getAdminNotifications, deleteNotification, markAsRead } from "../controllers/notification.controller";

export const notificationRoutes = Router();

// GET /api/notifications/admin
notificationRoutes.get("/admin", getAdminNotifications);

// DELETE /api/notifications/:id
notificationRoutes.delete("/:id", deleteNotification);

// PATCH /api/notifications/:id/read
notificationRoutes.patch("/:id/read", markAsRead);
