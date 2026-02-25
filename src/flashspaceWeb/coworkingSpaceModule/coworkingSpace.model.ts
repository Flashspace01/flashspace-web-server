import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
  Severity,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";
import { GeoLocation } from "../shared/geolocation.schema";

export enum InventoryType {
  PRIVATE_CABIN = "PRIVATE_CABIN",
  OPEN_DESK = "OPEN_DESK",
  OTHER = "OTHER",
}

class InventoryItem {
  @prop({ required: true, enum: InventoryType })
  public type!: InventoryType;

  // Required only if type is "OTHER"
  @prop({ required: false, trim: true })
  public customName?: string;

  @prop({ required: true, default: 0 })
  public totalUnits!: number;

  // --- Long-Term Pricing ---
  @prop({ required: false, default: 0 })
  public pricePerMonth?: number;

  @prop({ required: false, default: 0 })
  public pricePerYear?: number;

  // --- Short-Term "Day Pass" Pricing ---
  @prop({ required: false })
  public pricePerDay?: number;

  @prop({ required: false })
  public pricePerHour?: number;
}

class OperatingHours {
  @prop({ required: true, trim: true })
  public openTime!: string; // e.g., "09:00"

  @prop({ required: true, trim: true })
  public closeTime!: string; // e.g., "18:00"

  @prop({ type: () => [String], required: true })
  public daysOpen!: string[]; // e.g., ["Monday", "Tuesday", "Wednesday"]
}

@modelOptions({
  schemaOptions: { timestamps: true },
  options: { allowMixed: Severity.ALLOW },
})
@index({ city: 1, area: 1 })
@index({ "inventory.type": 1 })
@index({ popular: 1 })
@index({ avgRating: -1 })
@index({ location: "2dsphere" })
export class CoworkingSpace {
  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true })
  public address!: string;

  @prop({ required: true, index: true })
  public city!: string;

  @prop({ required: true, index: true })
  public area!: string;

  @prop({ type: () => GeoLocation, _id: false })
  public location?: GeoLocation;

  @prop({ required: true })
  public capacity!: number;

  @prop({ default: false })
  public sponsored!: boolean;

  @prop({ default: false })
  public popular!: boolean;

  // The restructured inventory
  @prop({ type: () => [InventoryItem], _id: false })
  public inventory!: InventoryItem[];

  // Added Operating Hours for Day Pass logic
  @prop({ type: () => OperatingHours, _id: false })
  public operatingHours?: OperatingHours;

  @prop({ type: () => [String] })
  public amenities!: string[];

  @prop({ default: 0 })
  public avgRating!: number;

  @prop({ default: 0 })
  public totalReviews!: number;

  @prop({ type: () => [String], required: true })
  public images!: string[];

  @prop({ default: true })
  public isActive!: boolean;

  @prop({ default: false })
  public isDeleted!: boolean;

  @prop({ ref: () => User, required: true })
  public partner!: Ref<User>;
}

export const CoworkingSpaceModel = getModelForClass(CoworkingSpace);