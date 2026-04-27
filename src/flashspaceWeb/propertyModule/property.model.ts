import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";
import { GeoLocation } from "../shared/geolocation.schema";

export enum KYCStatus {
  APPROVED = "approved",
  REJECTED = "rejected",
  PENDING = "pending",
  NOT_STARTED = "not_started",
}

// 1. ADDED: Overall property lifecycle status
export enum PropertyStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  ACTIVE = "active",
  SUSPENDED = "suspended",
}

export class PropertyKYCDocumentItem {
  @prop({ required: true })
  public type!: string;

  @prop({ required: true })
  public name!: string;

  @prop()
  public fileUrl?: string;

  @prop({ enum: ["pending", "approved", "rejected"], default: "pending" })
  public status?: string;

  @prop()
  public rejectionReason?: string;

  @prop()
  public uploadedAt?: Date;

  @prop()
  public verifiedAt?: Date;

  @prop({ ref: () => User })
  public verifiedBy?: Ref<User>;
}

@modelOptions({
  schemaOptions: { timestamps: true },
})
@index({ city: 1, area: 1 })
@index({ location: "2dsphere" })
@index({ isActive: 1, isDeleted: 1 }) // ADDED: Index for fast frontend filtering
export class Property {
  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: false, trim: true })
  public spaceId?: string;

  @prop({ required: true })
  public address!: string;

  @prop({ required: true, trim: true })
  public city!: string;

  @prop({ required: true, trim: true })
  public area!: string;

  @prop({ required: true, type: () => [String] })
  public features!: string[];

  @prop({ type: () => GeoLocation, _id: false })
  public location?: GeoLocation;

  @prop({ type: () => [String], default: [] })
  public images!: string[];

  // --- KYC & WORKFLOW ADDITIONS ---
  @prop({ default: KYCStatus.NOT_STARTED, enum: KYCStatus })
  public kycStatus?: KYCStatus;

  @prop()
  public kycRejectionReason?: string;

  @prop({ type: () => [PropertyKYCDocumentItem], default: [] })
  public documents?: PropertyKYCDocumentItem[];

  // Optional: Link directly to the document submission for this property
  // @prop({ ref: () => KYCDocument })
  // public kycDocumentId?: Ref<KYCDocument>;

  @prop({ enum: PropertyStatus, default: PropertyStatus.DRAFT })
  public status!: PropertyStatus;

  // --- MASTER CONTROLS ---
  @prop({ default: false })
  public isActive!: boolean; // Admin must toggle this to true

  @prop({ default: false })
  public isDeleted!: boolean; // For soft deletes

  @prop({ ref: () => User, required: true })
  public partner!: Ref<User>;

  @prop()
  public googleMapLink?: string;

  // --- BUSINESS & BANK DETAILS (Migrated from SpaceUserKyc) ---
  @prop({ trim: true })
  public companyName?: string;

  @prop({ trim: true })
  public gstNumber?: string;

  @prop({ trim: true })
  public panNumber?: string;

  @prop({ trim: true })
  public registeredAddress?: string;

  @prop({ trim: true })
  public contactPhone?: string;

  @prop({ trim: true })
  public accountHolderName?: string;

  @prop({ trim: true })
  public bankName?: string;

  @prop({ trim: true })
  public accountNumber?: string;

  @prop({ trim: true })
  public ifscCode?: string;

  @prop({ trim: true })
  public branch?: string;

  @prop({ trim: true })
  public accountType?: string;
}

export const PropertyModel = getModelForClass(Property);
