
import mongoose, { Schema, Document } from 'mongoose';

export enum NotificationType {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    TICKET_UPDATE = 'TICKET_UPDATE',
    MEETING_BOOKED = 'MEETING_BOOKED'
}

export enum NotificationRecipientType {
    USER = 'USER',
    ADMIN = 'ADMIN',
    PARTNER = 'PARTNER'
}

export interface INotification extends Document {
    recipient: string; // UserId or 'ADMIN'
    recipientType: NotificationRecipientType;
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;
    metadata?: any; // e.g. ticketId, meetingId
    createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
    recipient: { type: String, required: true, index: true },
    recipientType: { type: String, enum: Object.values(NotificationRecipientType), required: true },
    type: { type: String, enum: Object.values(NotificationType), default: NotificationType.INFO },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);
