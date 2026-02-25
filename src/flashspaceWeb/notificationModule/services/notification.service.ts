
import { getIO } from '../../../socket';
import { NotificationModel, NotificationType, NotificationRecipientType } from '../models/Notification';

interface SendNotificationPayload {
    recipient: string;
    recipientType: NotificationRecipientType;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
}

export class NotificationService {

    /**
     * core function to send notification (DB + Socket)
     */
    static async send(payload: SendNotificationPayload) {
        try {
            // 1. Save to Database
            const notification = await NotificationModel.create({
                ...payload,
                read: false
            });

            // 2. Emit to Socket.io
            try {
                const io = getIO();

                // Determine Room based on recipient
                let room = '';
                if (payload.recipientType === NotificationRecipientType.ADMIN) {
                    room = 'admin_feed';
                } else {
                    room = payload.recipient; // User ID as room
                }

                io.to(room).emit('notification:new', notification);
                console.log(`[Notification] Sent to ${room}: ${payload.title}`);

            } catch (socketError) {
                console.warn('[Notification] Socket not initialized or failed to emit', socketError);
                // We don't throw here because DB save was successful
            }

            return notification;
        } catch (error) {
            console.error('[Notification] Error sending notification:', error);
            throw error;
        }
    }

    // --- Helper Methods ---

    static async notifyAdmin(title: string, message: string, type: NotificationType = NotificationType.INFO, metadata?: any) {
        return this.send({
            recipient: 'ADMIN',
            recipientType: NotificationRecipientType.ADMIN,
            type,
            title,
            message,
            metadata
        });
    }

    static async notifyUser(userId: string, title: string, message: string, type: NotificationType = NotificationType.INFO, metadata?: any) {
        return this.send({
            recipient: userId,
            recipientType: NotificationRecipientType.USER,
            type,
            title,
            message,
            metadata
        });
    }

    static async markAsRead(notificationId: string) {
        return await NotificationModel.findByIdAndUpdate(notificationId, { read: true }, { new: true });
    }

    static async markAllAsRead(userId: string) {
        return await NotificationModel.updateMany({ recipient: userId, read: false }, { read: true });
    }

    static async getUserNotifications(userId: string, limit = 20) {
        return await NotificationModel.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    static async getAdminNotifications(limit = 10000) {
        return await NotificationModel.find({ recipientType: NotificationRecipientType.ADMIN })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    static async deleteNotification(notificationId: string) {
        return await NotificationModel.findByIdAndDelete(notificationId);
    }

    static async deleteAllForUser(userId: string) {
        return await NotificationModel.deleteMany({ recipient: userId });
    }

    static async deleteAllForAdmin() {
        return await NotificationModel.deleteMany({ recipientType: NotificationRecipientType.ADMIN });
    }
}
