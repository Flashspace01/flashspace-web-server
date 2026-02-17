import { Types } from "mongoose";
import { ApiResponse } from "../../authModule/types/auth.types";
import { SpacePortalNotificationModel } from "../models/notification.model";

export type ListNotificationsParams = {
  userId: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

export class SpacePortalNotificationsService {
  async getNotifications(params: ListNotificationsParams): Promise<ApiResponse> {
    try {
      const { userId, page = 1, limit = 20, unreadOnly = false } = params;

      const query: any = { user: userId, isDeleted: false };
      if (unreadOnly) query.read = false;

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        SpacePortalNotificationModel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        SpacePortalNotificationModel.countDocuments(query),
      ]);

      const mappedNotifications = notifications.map((notification: any) => ({
        ...(notification.toObject ? notification.toObject() : notification),
        id: notification._id?.toString?.() || notification.id,
      }));

      return {
        success: true,
        message: "Notifications fetched successfully",
        data: {
          notifications: mappedNotifications,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch notifications",
        error: error?.message,
      };
    }
  }

  async markRead(notificationId: string, read: boolean): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(notificationId)) {
        return {
          success: false,
          message: "Invalid notification ID format",
        };
      }

      const updated = await SpacePortalNotificationModel.findOneAndUpdate(
        { _id: notificationId, isDeleted: false },
        { read },
        { new: true }
      );

      if (!updated) {
        return {
          success: false,
          message: "Notification not found",
        };
      }

      return {
        success: true,
        message: "Notification updated successfully",
        data: updated,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update notification",
        error: error?.message,
      };
    }
  }

  async clearAll(userId: string): Promise<ApiResponse> {
    try {
      await SpacePortalNotificationModel.updateMany(
        { user: userId, isDeleted: false },
        { isDeleted: true }
      );

      return {
        success: true,
        message: "Notifications cleared",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to clear notifications",
        error: error?.message,
      };
    }
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(notificationId)) {
        return {
          success: false,
          message: "Invalid notification ID format",
        };
      }

      const updated = await SpacePortalNotificationModel.findOneAndUpdate(
        { _id: notificationId, isDeleted: false },
        { isDeleted: true },
        { new: true }
      );

      if (!updated) {
        return {
          success: false,
          message: "Notification not found",
        };
      }

      return {
        success: true,
        message: "Notification deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to delete notification",
        error: error?.message,
      };
    }
  }

  async restoreNotification(notificationId: string): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(notificationId)) {
        return {
          success: false,
          message: "Invalid notification ID format",
        };
      }

      const updated = await SpacePortalNotificationModel.findOneAndUpdate(
        { _id: notificationId, isDeleted: true },
        { isDeleted: false },
        { new: true }
      );

      if (!updated) {
        return {
          success: false,
          message: "Notification not found",
        };
      }

      return {
        success: true,
        message: "Notification restored successfully",
        data: updated,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to restore notification",
        error: error?.message,
      };
    }
  }
}
