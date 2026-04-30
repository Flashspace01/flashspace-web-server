
import { getIO } from '../../../socket';
import { NotificationModel, NotificationType, NotificationRecipientType } from '../models/Notification';
import { UserModel } from '../../authModule/models/user.model';

interface SendNotificationPayload {
    recipient: string;
    recipientType: NotificationRecipientType;
    type: NotificationType;
    title: string;
    message: string;
    archived?: boolean;
    metadata?: any;
}

export type NotificationPreferenceKey =
  | "email"
  | "push"
  | "promotional"
  | "reminders"
  | "loginAlerts";

interface NotifyUserOptions {
    preferenceKey?: NotificationPreferenceKey;
}

export class NotificationService {
    private static readonly defaultPreferences: Record<NotificationPreferenceKey, boolean> = {
        email: true,
        push: true,
        promotional: false,
        reminders: true,
        loginAlerts: true,
    };

    private static normalizePreferences(
        raw?: Partial<Record<NotificationPreferenceKey, boolean>>,
    ): Record<NotificationPreferenceKey, boolean> {
        return {
            email: typeof raw?.email === "boolean" ? raw.email : this.defaultPreferences.email,
            push: typeof raw?.push === "boolean" ? raw.push : this.defaultPreferences.push,
            promotional:
                typeof raw?.promotional === "boolean"
                    ? raw.promotional
                    : this.defaultPreferences.promotional,
            reminders:
                typeof raw?.reminders === "boolean"
                    ? raw.reminders
                    : this.defaultPreferences.reminders,
            loginAlerts:
                typeof raw?.loginAlerts === "boolean"
                    ? raw.loginAlerts
                    : this.defaultPreferences.loginAlerts,
        };
    }

    private static async getUserPreferences(userId: string) {
        try {
            const user = await UserModel.findById(userId)
                .select("notifications")
                .lean<{ notifications?: Partial<Record<NotificationPreferenceKey, boolean>> }>();

            if (!user) return { ...this.defaultPreferences };
            return this.normalizePreferences(user.notifications);
        } catch (error) {
            console.error("[Notification] Failed to read user preferences:", error);
            return { ...this.defaultPreferences };
        }
    }

    private static inferPreferenceKeyFromNotification(notification: {
        title?: string;
        message?: string;
        metadata?: any;
    }): NotificationPreferenceKey | null {
        const metadata = notification?.metadata;
        const explicitPreference = metadata?.__preferenceKey;

        if (
            explicitPreference === "email" ||
            explicitPreference === "push" ||
            explicitPreference === "promotional" ||
            explicitPreference === "reminders" ||
            explicitPreference === "loginAlerts"
        ) {
            return explicitPreference;
        }

        const combinedText = `${notification?.title || ""} ${notification?.message || ""}`.toLowerCase();

        const isKycLike =
            combinedText.includes("kyc") ||
            combinedText.includes("partner application") ||
            combinedText.includes("business profile") ||
            Boolean(metadata?.kycId) ||
            Boolean(metadata?.partnerId) ||
            Boolean(metadata?.businessId);

        if (isKycLike) return "reminders";

        const isMailLike =
            combinedText.includes("mail") ||
            combinedText.includes("parcel") ||
            combinedText.includes("courier") ||
            Boolean(metadata?.mailRecordId) ||
            Boolean(metadata?.mailId);

        if (isMailLike) return "push";

        const isVisitLike =
            combinedText.includes("visit") ||
            combinedText.includes("visitor") ||
            Boolean(metadata?.visitId) ||
            Boolean(metadata?.visitorId);

        if (isVisitLike) return "loginAlerts";

        const isPromotionalLike =
            combinedText.includes("marketing") ||
            combinedText.includes("offer") ||
            combinedText.includes("announcement") ||
            combinedText.includes("promo");

        if (isPromotionalLike) return "promotional";

        return null;
    }

    private static async isPreferenceEnabled(
        userId: string,
        preferenceKey?: NotificationPreferenceKey,
    ): Promise<boolean> {
        if (!preferenceKey) return true;

        const preferences = await this.getUserPreferences(userId);
        return preferences[preferenceKey];
    }

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

    static async notifyUser(
        userId: string,
        title: string,
        message: string,
        type: NotificationType = NotificationType.INFO,
        metadata?: any,
        options?: NotifyUserOptions,
    ) {
        const resolvedPreferenceKey =
            options?.preferenceKey ||
            this.inferPreferenceKeyFromNotification({ title, message, metadata }) ||
            undefined;
        const shouldSend = await this.isPreferenceEnabled(
            userId,
            resolvedPreferenceKey,
        );

        if (!shouldSend) {
            console.log(
                `[Notification] Skipped for user ${userId}. Preference '${resolvedPreferenceKey}' is disabled.`,
            );
            return null;
        }

        let metadataWithPreference = metadata;
        if (resolvedPreferenceKey) {
            if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
                metadataWithPreference = { ...metadata, __preferenceKey: resolvedPreferenceKey };
            } else if (typeof metadata === "undefined") {
                metadataWithPreference = { __preferenceKey: resolvedPreferenceKey };
            } else {
                metadataWithPreference = {
                    value: metadata,
                    __preferenceKey: resolvedPreferenceKey,
                };
            }
        }

        return this.send({
            recipient: userId,
            recipientType: NotificationRecipientType.USER,
            type,
            title,
            message,
            archived: false,
            metadata: metadataWithPreference,
        });
    }

    static async markAsRead(notificationId: string) {
        return await NotificationModel.findByIdAndUpdate(notificationId, { read: true }, { new: true });
    }

    static async markAllAsRead(userId: string) {
        return await NotificationModel.updateMany(
            { recipient: userId, read: false, archived: { $ne: true } },
            { read: true },
        );
    }

    static async getUserNotifications(
        userId: string,
        limit = 100,
        archiveFilter: "active" | "archived" | "all" = "active",
    ) {
        const query: any = { recipient: userId };
        if (archiveFilter === "active") {
            query.archived = { $ne: true };
        } else if (archiveFilter === "archived") {
            query.archived = true;
        }

        console.log(`[NotificationService] Fetching all notifications for user ${userId}`);

        return await NotificationModel.find(query)
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    static async getAdminNotifications(limit = 10000) {
        return await NotificationModel.find({
            recipientType: NotificationRecipientType.ADMIN,
            archived: { $ne: true },
        })
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    static async deleteNotification(notificationId: string) {
        return await NotificationModel.findByIdAndUpdate(
            notificationId,
            { $set: { archived: true }, $unset: { deletedAt: "" } },
            { new: true },
        );
    }

    static async toggleArchive(notificationId: string) {
        const notification = await NotificationModel.findById(notificationId);
        if (!notification) throw new Error("Notification not found");
        
        notification.archived = !notification.archived;
        notification.deletedAt = undefined;
        return await notification.save();
    }

    static async deleteAllForUser(userId: string) {
        return await NotificationModel.updateMany(
            { recipient: userId, archived: { $ne: true } },
            { $set: { archived: true }, $unset: { deletedAt: "" } },
        );
    }

    static async deleteAllForAdmin() {
        return await NotificationModel.updateMany(
            { recipientType: NotificationRecipientType.ADMIN, archived: { $ne: true } },
            { $set: { archived: true }, $unset: { deletedAt: "" } },
        );
    }
}
