import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";
import { GeoLocation } from "../shared/geolocation.schema";
// Import your KYC model if you have a specific one for properties, otherwise use 'any' or your existing KYC model
// import { KYCDocument } from "../kycModule/models/kyc.model";

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

@modelOptions({
  schemaOptions: { timestamps: true },
})
@index({ city: 1, area: 1 })
@index({ location: "2dsphere" })
@index({ isActive: 1, isDeleted: 1 }) // ADDED: Index for fast frontend filtering
export class Property {
  @prop({ required: true, trim: true })
  public name!: string;

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
}

export const PropertyModel = getModelForClass(Property);