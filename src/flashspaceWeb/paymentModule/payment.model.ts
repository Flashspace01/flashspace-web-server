import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
} from "@typegoose/typegoose";
import { Types } from "mongoose";
import { User } from "../authModule/models/user.model";
import { SeatBooking } from "../seatingModule/seating.model";

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
}
export enum PaymentType {
  VIRTUAL_OFFICE = "virtual_office",
  COWORKING_SPACE = "coworking_space",
  MEETING_ROOM = "meeting_room",
  SEAT_BOOKING = "seat_booking",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ razorpayPaymentId: 1 })
@index({ userId: 1 })
@index({ status: 1 })
@index({ createdAt: -1 })
export class Payment {
  @prop({ ref: () => User, required: true })
  public user!: Ref<User>;

  @prop({ required: true })
  public userEmail!: string;

  @prop({ required: true })
  public userName!: string;

  @prop({ required: false }) // Phone is optional - not all users have phone numbers
  public userPhone?: string;

  // Razorpay Details
  @prop({ required: true, unique: true })
  public razorpayOrderId!: string;

  @prop()
  public razorpayPaymentId?: string;

  @prop()
  public razorpaySignature?: string;

  // Payment Details
  @prop({ required: true })
  public amount!: number; // The actual amount in INR

  @prop({ required: true, default: "INR" })
  public currency!: string;

  @prop({
    type: () => String,
    required: true,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  public status!: PaymentStatus;

  // Booking Details
  @prop({ type: () => String, required: true, enum: PaymentType })
  public paymentType!: PaymentType;

  @prop({ required: true })
  public spaceModel!: string;

  @prop({
    required: true,
    refPath: "spaceModel",
  })
  public space!: Types.ObjectId;

  @prop({ required: true })
  public spaceName!: string;

  @prop({ required: true })
  public planName!: string;

  @prop({ required: true })
  public planKey!: string;

  @prop({ required: true })
  public tenure!: number; // Years

  @prop({ required: true })
  public yearlyPrice!: number;

  @prop({ required: true })
  public totalAmount!: number;

  @prop({ default: 0 })
  public discountPercent!: number;

  @prop({ default: 0 })
  public discountAmount!: number;

  // Booking Start Date (user-selected)
  @prop()
  public startDate?: Date;

  // Affiliate / Coupon Attribution
  @prop()
  public couponCode?: string; // Coupon code applied by the user

  @prop()
  public affiliateId?: string; // Affiliate whose coupon was used

  @prop()
  public notes?: string;

  @prop({ ref: () => SeatBooking })
  public seatBooking?: Ref<SeatBooking>;

  @prop({ default: 0 })
  public creditsUsed?: number;

  @prop()
  public errorMessage?: string;

  @prop()
  public refundId?: string;

  @prop()
  public refundAmount?: number;

  @prop({ default: false })
  public isDeleted?: boolean;
}

export const PaymentModel = getModelForClass(Payment);
