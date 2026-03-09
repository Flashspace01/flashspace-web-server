import { prop, getModelForClass, Ref, modelOptions, Severity } from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";

class TicketMessage {
  @prop({ required: true, enum: ["user", "support"] })
  sender!: string;

  @prop({ required: true })
  senderName!: string;

  @prop({ ref: () => User })
  senderId?: Ref<User>;

  @prop({ required: true })
  message!: string;

  @prop({ type: () => [String], default: [] })
  attachments?: string[];

  @prop({ default: Date.now })
  createdAt?: Date;
}

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class SupportTicket {
  @prop({ required: true, unique: true })
  ticketNumber!: string;

  @prop({ ref: () => User, required: true })
  user!: Ref<User>;

  @prop()
  bookingId?: string;

  @prop({ required: true })
  subject!: string;

  @prop({
    required: true,
    enum: ["virtual_office", "coworking", "billing", "kyc", "technical", "other"],
  })
  category!: string;

  @prop({ enum: ["low", "medium", "high", "urgent"], default: "medium" })
  priority?: string;

  @prop({
    enum: ["open", "in_progress", "waiting_customer", "resolved", "closed"],
    default: "open",
  })
  status?: string;

  @prop({ type: () => [TicketMessage], default: [] })
  messages?: TicketMessage[];

  @prop({ ref: () => User })
  assignedTo?: Ref<User>;

  @prop()
  resolvedAt?: Date;

  @prop()
  closedAt?: Date;

  @prop({ default: false })
  isDeleted?: boolean;

  @prop({ default: Date.now })
  createdAt?: Date;

  @prop({ default: Date.now })
  updatedAt?: Date;
}

export const SupportTicketModel = getModelForClass(SupportTicket);
