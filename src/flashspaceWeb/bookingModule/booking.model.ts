import {
  prop,
  getModelForClass,
  Ref,
  modelOptions,
  Severity,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";
import { Payment } from "../paymentModule/payment.model";
import { KYCDocument } from "../userDashboardModule/models/kyc.model";
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

  @prop()
  partnerPrice?: number;

  @prop()
  adminMarkup?: number;

  @prop()
  finalPrice?: number;

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
  fileUrl?: string;

  @prop({
    enum: ["pending", "approved", "rejected", "available"],
    default: "available",
  })
  status?: string;

  @prop()
  rejectionReason?: string;

  @prop()
  uploadedBy?: string;

  @prop()
  reviewedAt?: Date;

  @prop()
  generatedAt?: Date;

  @prop({ enum: ["pending", "approved", "rejected"], default: "pending" })
  partnerReviewStatus?: string;

  @prop()
  partnerRejectionReason?: string;

  @prop()
  partnerReviewedAt?: Date;

  @prop()
  partnerReviewedBy?: string;
}

class BookingKycDocumentReview {
  @prop()
  profileModel?: string;

  @prop()
  profileId?: string;

  @prop()
  documentId?: string;

  @prop()
  documentType?: string;

  @prop({
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  })
  status?: string;

  @prop()
  rejectionReason?: string;

  @prop()
  reviewedAt?: Date;

  @prop()
  reviewedBy?: string;
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

  @prop({ ref: () => User, required: true })
  partner!: Ref<User>;

  @prop({
    required: true,
    // <-- FIXED: Added event_space
    enum: ["VirtualOffice", "CoworkingSpace", "MeetingRoom"],
  })
  type!: string;

  @prop({
    required: true,
    refPath: "type",
  })
  spaceId!: mongoose.Types.ObjectId;

  @prop({ type: () => SpaceSnapshot })
  spaceSnapshot?: SpaceSnapshot;

  @prop({ type: () => PlanDetails, required: true })
  plan!: PlanDetails;

  @prop({ ref: () => Payment })
  payment?: Ref<Payment>;

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

  @prop({ type: () => mongoose.Schema.Types.ObjectId })
  kycProfile?: any; // Reference to the KYC profile used for this booking (KYCDocument or BusinessInfo ID)

  @prop({
    enum: ["not_started", "pending", "approved", "rejected"],
    default: "not_started",
  })
  kycStatus?: string;

  @prop({ type: () => [TimelineEntry], default: [] })
  timeline?: TimelineEntry[];

  @prop({ type: () => [BookingDocument], default: [] })
  documents?: BookingDocument[];

  @prop({ type: () => [BookingKycDocumentReview], default: [] })
  kycDocumentReviews?: BookingKycDocumentReview[];

  @prop({
    enum: ["draft", "submitted", "in_review", "completed"],
    default: "draft",
  })
  partnerRequestStatus?: string;

  @prop()
  partnerRequestSubmittedAt?: Date;

  @prop()
  startDate?: Date;

  @prop()
  endDate?: Date;

  @prop({ default: false })
  autoRenew?: boolean;

  @prop()
  couponCode?: string; // Coupon code applied at booking time

  @prop()
  affiliateId?: mongoose.Types.ObjectId; // Affiliate who referred this booking

  @prop({ type: () => [String], default: [] })
  features?: string[];

  @prop({ type: () => [String], default: undefined })
  selectedPartners?: string[];

  @prop({ default: false })
  isDeleted?: boolean;

  @prop({ default: Date.now })
  createdAt?: Date;

  @prop({ default: Date.now })
  updatedAt?: Date;
}

export const BookingModel = getModelForClass(Booking);
