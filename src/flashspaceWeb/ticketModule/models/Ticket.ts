import { prop, modelOptions, getModelForClass, index, Ref } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Types } from "mongoose";
import { User } from "../../authModule/models/user.model";

export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  ESCALATED = "escalated",
  RESOLVED = "resolved",
  CLOSED = "closed"
}

export enum TicketPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

export enum TicketCategory {
  VIRTUAL_OFFICE = "virtual_office",
  COWORKING = "coworking",
  BILLING = "billing",
  KYC = "kyc",
  TECHNICAL = "technical",
  MAIL_SERVICES = "mail_services",
  BOOKINGS = "bookings",
  COMPLIANCE = "compliance",
  OTHER = "other"
}

export interface Message {
  sender: 'user' | 'support' | 'admin';
  message: string;
  attachments?: string[];
  createdAt: Date;
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "tickets",
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  },
})
@index({ ticketNumber: 1 }, { unique: true })
@index({ user: 1, createdAt: -1 })
@index({ status: 1, priority: 1 })
@index({ category: 1 })
@index({ assignee: 1 })
@index({ updatedAt: -1 })
@index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export class Ticket extends TimeStamps {
  public _id!: Types.ObjectId;

  @prop({ required: true, unique: true })
  public ticketNumber!: string;

  @prop({ required: true, trim: true })
  public subject!: string;

  @prop({ required: true, trim: true })
  public description!: string;

  @prop({ required: true, ref: () => User })
  public user!: Ref<User>;

  @prop({ ref: () => User, default: null })
  public assignee?: Ref<User>;

  @prop({ enum: TicketCategory, required: true })
  public category!: TicketCategory;

  @prop({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  public priority!: TicketPriority;

  @prop({ enum: TicketStatus, default: TicketStatus.OPEN })
  public status!: TicketStatus;

  @prop({ type: () => [Object], default: [] })
  public messages!: Message[];

  @prop({ default: [] })
  public attachments!: string[];

  @prop({ default: null })
  public resolvedAt?: Date;

  @prop({ default: null })
  public closedAt?: Date;

  @prop({ default: null })
  public deadline?: Date;

  // For auto-closing inactive tickets (30 days after last update)
  @prop()
  public expiresAt?: Date;

  // Helper method to generate ticket number
  static generateTicketNumber(): string {
    const prefix = "TKT";
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${year}${month}${random}`;
  }

  // Add message to ticket
  addMessage(sender: 'user' | 'support' | 'admin', message: string, attachments?: string[]) {
    this.messages.push({
      sender,
      message,
      attachments,
      createdAt: new Date()
    });
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Reset expiry on new activity
  }

  // Update status
  updateStatus(newStatus: TicketStatus) {
    this.status = newStatus;
    if (newStatus === TicketStatus.RESOLVED) {
      this.resolvedAt = new Date();
    } else if (newStatus === TicketStatus.CLOSED) {
      this.closedAt = new Date();
    }
  }
}

export const TicketModel = getModelForClass(Ticket);