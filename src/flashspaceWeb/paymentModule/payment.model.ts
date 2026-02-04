import { prop, getModelForClass, modelOptions, index, Ref } from "@typegoose/typegoose";

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
  CANCELLED = "cancelled"
}

export enum PaymentType {
  VIRTUAL_OFFICE = "virtual_office",
  COWORKING_SPACE = "coworking_space",
  MEETING_ROOM = "meeting_room"
}

@modelOptions({
  schemaOptions: {
    timestamps: true
  }
})
@index({ razorpayPaymentId: 1 })
@index({ userId: 1 })
@index({ status: 1 })
@index({ createdAt: -1 })
export class Payment {
  @prop({ required: true })
  public userId!: string;

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
  public amount!: number; // In paise (₹100 = 10000 paise)

  @prop({ required: true, default: "INR" })
  public currency!: string;

  @prop({ required: true, enum: PaymentStatus, default: PaymentStatus.PENDING })
  public status!: PaymentStatus;

  // Booking Details
  @prop({ required: true, enum: PaymentType })
  public paymentType!: PaymentType;

  @prop({ required: true })
  public spaceId!: string;

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

  // Metadata
  @prop()
  public notes?: string;

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
