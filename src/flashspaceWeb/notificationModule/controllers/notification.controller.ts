import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";
import { NotificationType } from "../models/Notification";

export const getAdminNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await NotificationService.getAdminNotifications();
    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await NotificationService.deleteNotification(id);
    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const updatedNotification = await NotificationService.markAsRead(id);
    res.status(200).json({
      success: true,
      data: updatedNotification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};
