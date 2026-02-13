import {
    prop,
    getModelForClass,
    modelOptions,
    Index,
    ReturnModelType,
} from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Types } from "mongoose";
import { User } from "../../authModule/models/user.model";

export enum TicketStatus {
    OPEN = "open",
    IN_PROGRESS = "in progress",
    RESOLVED = "resolved",
}

export enum TicketPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
}

class Message {
    @prop({ required: true, enum: ["user", "bot", "admin"] })
    public role!: string;

    @prop({ required: true, trim: true })
    public text!: string;

    @prop({ default: Date.now })
    public timestamp!: Date;

    // Helper to format time as "10:30 AM"
    public get time(): string {
        return this.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }
}

@modelOptions({
    schemaOptions: {
        timestamps: true,
        collection: "affiliate_support_tickets",
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    },
})
@Index({ affiliateId: 1 })
@Index({ status: 1 })
export class AffiliateSupportTicket extends TimeStamps {
    public _id!: Types.ObjectId;

    @prop({ required: true, unique: true, trim: true })
    public ticketId!: string; // e.g., TKT-2024-045

    @prop({ ref: () => User, required: true })
    public affiliateId!: Types.ObjectId;

    @prop({ required: true, trim: true })
    public subject!: string;

    @prop({ enum: TicketStatus, default: TicketStatus.OPEN })
    public status!: TicketStatus;

    @prop({ enum: TicketPriority, default: TicketPriority.MEDIUM })
    public priority!: TicketPriority;

    @prop({ type: () => Message, default: [] })
    public messages!: Message[];


}

// Standalone function to avoid Typegoose static method issues
export async function generateTicketId(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `TKT-${currentYear}-`;

    const lastTicket = await AffiliateSupportTicketModel.findOne({
        ticketId: new RegExp(`^${prefix}\\d+$`),
    })
        .sort({ ticketId: -1 })
        .select("ticketId")
        .lean();

    let nextSequence = 1;
    if (lastTicket?.ticketId) {
        const parts = String(lastTicket.ticketId).split("-");
        const lastSequence = Number(parts[parts.length - 1]);
        if (Number.isFinite(lastSequence) && lastSequence > 0) {
            nextSequence = lastSequence + 1;
        }
    }

    let candidateId = `${prefix}${String(nextSequence).padStart(3, "0")}`;
    while (await AffiliateSupportTicketModel.exists({ ticketId: candidateId })) {
        nextSequence += 1;
        candidateId = `${prefix}${String(nextSequence).padStart(3, "0")}`;
    }

    return candidateId;
}


export const AffiliateSupportTicketModel = getModelForClass(AffiliateSupportTicket);
export const SupportTicketModel = AffiliateSupportTicketModel; // Alias for backward compatibility if needed, but safer to use new name
