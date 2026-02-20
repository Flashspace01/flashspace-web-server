import { prop, getModelForClass, Ref, index } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { User } from "../../authModule/models/user.model";

export enum BookingStatus {
  ACTIVE = "Active",
  PENDING = "Pending",
  RENEWAL_DUE = "Renewal Due",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled"
}

@index({ affiliateId: 1 })
@index({ status: 1 })
export class AffiliateBooking extends TimeStamps {
  @prop({ ref: () => User, required: true })
  public affiliateId!: Ref<User>;

  @prop({ required: true, trim: true })
  public companyName!: string;

  @prop({ required: true, trim: true })
  public contactPerson!: string;

  @prop({ required: true, trim: true })
  public email!: string;

  @prop({ required: true, trim: true })
  public phone!: string;

  @prop({ required: true })
  public plan!: string;

  @prop({ required: true })
  public location!: string;

  // Store dates as strings for flexibility or Date objects? 
  // Per frontend mock, strings like "Jan 15, 2024 - Jan 15, 2025" are used.
  // Ideally, use startDate and endDate.
  @prop({ required: true })
  public startDate!: Date;

  @prop({ required: true })
  public endDate!: Date;

  @prop({ required: true })
  public bookingAmount!: number;

  @prop({ required: true })
  public commissionAmount!: number;

  @prop({ enum: BookingStatus, default: BookingStatus.PENDING })
  public status!: BookingStatus;

  // For quick display
  public get duration(): string {
    const start = this.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const end = this.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  }
}

export const AffiliateBookingModel = getModelForClass(AffiliateBooking);
