
import { Router } from "express";
import { getAdminNotifications, getUserNotifications, deleteNotification, markAsRead, deleteAllForAdmin } from "../controllers/notification.controller";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";

export const notificationRoutes = Router();

// GET /api/notifications/admin
notificationRoutes.get("/admin", getAdminNotifications);

// GET /api/notifications (current user)
notificationRoutes.get("/", AuthMiddleware.authenticate, getUserNotifications);

// DELETE /api/notifications/:id
notificationRoutes.delete("/:id", deleteNotification);

// DELETE /api/notifications/admin/all
notificationRoutes.delete("/admin/all", deleteAllForAdmin);

// PATCH /api/notifications/:id/read
notificationRoutes.patch("/:id/read", markAsRead);
