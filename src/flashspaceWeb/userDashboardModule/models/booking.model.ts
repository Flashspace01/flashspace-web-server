import {
  prop,
  getModelForClass,
  Ref,
  modelOptions,
  Severity,
} from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";
import mongoose from "mongoose";

class PlanDetails {
  @prop({ required: true })
  name!: string;

  @prop({ required: true })
  price!: number;

  @prop()
  originalPrice?: number;

  @prop({ default: 0 })
  discount?: number;

  @prop({ required: true })
  tenure!: number;

  @prop({ default: "months" })
  tenureUnit?: string;
}

class TimelineEntry {
  @prop({ required: true })
  status!: string;

  @prop({ required: true })
  date!: Date;

  @prop()
  note?: string;

  @prop()
  by?: string;
}

class BookingDocument {
  @prop({ required: true })
  name!: string;

  @prop({ required: true })
  type!: string;

  @prop()
  url?: string;

  @prop()
  generatedAt?: Date;
}

class SpaceSnapshot {
  @prop()
  _id?: string;

  @prop()
  name?: string;

  @prop()
  address?: string;

  @prop()
  city?: string;

  @prop()
  area?: string;

  @prop()
  image?: string;

  @prop({ type: () => Object })
  coordinates?: { lat: number; lng: number };
}

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Booking {
  @prop({ required: true, unique: true })
  bookingNumber!: string;

  @prop({ ref: () => User, required: true })
  user!: Ref<User>;

  @prop({
    required: true,
    enum: ["virtual_office", "coworking_space", "meeting_room"],
  })
  type!: string;

  @prop({ required: true })
  spaceId!: mongoose.Types.ObjectId;

  @prop({ type: () => SpaceSnapshot })
  spaceSnapshot?: SpaceSnapshot;

  @prop({ type: () => PlanDetails, required: true })
  plan!: PlanDetails;

  @prop()
  paymentId?: string;

  @prop()
  razorpayOrderId?: string;

  @prop()
  razorpayPaymentId?: string;

  @prop({
    required: true,
    enum: ["pending_payment", "pending_kyc", "active", "expired", "cancelled"],
    default: "pending_payment",
  })
  status!: string;

  @prop()
  kycProfileId?: string; // Reference to the KYC profile used for this booking

  @prop({
    enum: ["not_started", "pending", "approved", "rejected"],
    default: "not_started",
  })
  kycStatus?: string;

  @prop({ type: () => [TimelineEntry], default: [] })
  timeline?: TimelineEntry[];

  @prop({ type: () => [BookingDocument], default: [] })
  documents?: BookingDocument[];

  @prop()
  startDate?: Date;

  @prop()
  endDate?: Date;

  @prop({ default: false })
  autoRenew?: boolean;

  @prop({ type: () => [String], default: [] })
  features?: string[];

  @prop({ default: false })
  isDeleted?: boolean;

  @prop({ default: Date.now })
  createdAt?: Date;

  @prop({ default: Date.now })
  updatedAt?: Date;
}

export const BookingModel = getModelForClass(Booking);
