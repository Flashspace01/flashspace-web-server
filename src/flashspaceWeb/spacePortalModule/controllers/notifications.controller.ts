import { Request, Response } from "express";
import { SpacePortalNotificationsService } from "../services/notifications.service";

const notificationsService = new SpacePortalNotificationsService();

export const getNotifications = async (req: Request, res: Response) => {
  const { page, limit, unreadOnly } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const result = await notificationsService.getNotifications({
    userId,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    unreadOnly: unreadOnly === "true",
  });

  res.status(result.success ? 200 : 400).json(result);
};

export const markNotificationRead = async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const { read } = req.body as { read: boolean };

  const result = await notificationsService.markRead(notificationId, read);
  res.status(result.success ? 200 : 400).json(result);
};

export const clearNotifications = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const result = await notificationsService.clearAll(userId);
  res.status(result.success ? 200 : 400).json(result);
};

export const deleteNotification = async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const result = await notificationsService.deleteNotification(notificationId);
  res.status(result.success ? 200 : 400).json(result);
};

export const restoreNotification = async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const result = await notificationsService.restoreNotification(notificationId);
  res.status(result.success ? 200 : 400).json(result);
};
