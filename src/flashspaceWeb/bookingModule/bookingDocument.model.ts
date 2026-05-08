import { prop, getModelForClass, Ref, modelOptions, Severity } from "@typegoose/typegoose";
import { Booking } from "./booking.model";
import { User } from "../authModule/models/user.model";

class DocumentItem {
  @prop()
  id?: string;

  @prop({ required: true })
  name!: string;

  @prop({ required: true })
  type!: string;

  @prop({ required: true })
  url!: string;

  @prop({ enum: ["user_kyc", "partner_kyc", "business_kyc", "booking_specific"], required: true })
  category!: string;

  @prop()
  profileId?: string;

  @prop({ enum: ["pending", "approved", "rejected"], default: "pending" })
  adminStatus?: string;

  @prop()
  adminRejectionReason?: string;

  @prop()
  adminReviewedAt?: Date;

  @prop({ ref: () => User })
  adminReviewedBy?: Ref<User>;

  @prop({ enum: ["pending", "approved", "rejected"], default: "pending" })
  partnerStatus?: string;

  @prop()
  partnerRejectionReason?: string;

  @prop()
  partnerReviewedAt?: Date;

  @prop({ ref: () => User })
  partnerReviewedBy?: Ref<User>;

  @prop()
  uploadedBy?: string;
}

@modelOptions({ options: { allowMixed: Severity.ALLOW }, schemaOptions: { timestamps: true } })
export class BookingDocumentRecord {
  @prop({ ref: () => Booking, required: true })
  bookingId!: Ref<Booking>;

  @prop({ ref: () => User, required: true })
  userId!: Ref<User>;

  @prop({ type: () => [DocumentItem], default: [] })
  documents!: DocumentItem[];

  @prop({ enum: ["pending", "approved", "rejected"], default: "pending" })
  overallAdminStatus?: string;

  @prop({ enum: ["pending", "approved", "rejected"], default: "pending" })
  overallPartnerStatus?: string;
}

export const BookingDocumentRecordModel = getModelForClass(BookingDocumentRecord);
