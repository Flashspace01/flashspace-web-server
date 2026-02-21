import {
  prop,
  getModelForClass,
  modelOptions,
  index,
} from "@typegoose/typegoose";

export enum CouponStatus {
  ACTIVE = "active",
  USED = "used",
  EXPIRED = "expired",
<<<<<<< HEAD
  DISABLED = "disabled",
=======
    DISABLED = "disabled"
>>>>>>> 60d2433aec382aa11ef64d3e0e9bed4f4df9a6ac
}

@modelOptions({
  schemaOptions: {
<<<<<<< HEAD
    timestamps: true,
  },
=======
        timestamps: true
    }
>>>>>>> 60d2433aec382aa11ef64d3e0e9bed4f4df9a6ac
})
@index({ code: 1 }, { unique: true })
@index({ assignedClientId: 1 })
@index({ status: 1 })
export class Coupon {
  @prop({ required: true, unique: true, trim: true })
  public code!: string;

  @prop({ required: true, default: "percentage" })
  public discountType!: string; // Currently only 'percentage' is supported as per requirements

  @prop({ required: true })
  public discountValue!: number; // Percentage value (e.g., 10, 20)

  @prop({ required: true })
  public assignedClientId!: string; // User ID of the client

  @prop({ required: true, enum: CouponStatus, default: CouponStatus.ACTIVE })
  public status!: CouponStatus;

  @prop({ required: true })
  public expiryDate!: Date;

  @prop({ required: true })
  public createdBy!: string; // Admin ID

  @prop()
  public usedAt?: Date;

  @prop({ default: false })
  public isDeleted?: boolean;
}

export const CouponModel = getModelForClass(Coupon);
