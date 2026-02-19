import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
  Severity,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";

// --- SUB-SCHEMAS ---

class InventoryItem {
  @prop({ required: true, trim: true })
  public type!: string; // Hot Desk, Private Office, etc.

  @prop({ required: true, default: 0 })
  public totalUnits!: number;

  @prop({ required: true, default: 0 })
  public pricePerMonth!: number;
}

class FacilityItem {
  @prop({ required: true, trim: true })
  public name!: string; // Board Room, Conference Hall, etc.

  @prop({ required: true, default: 1 })
  public count!: number;

  @prop({ required: false })
  public hourlyRate?: number;
}

@modelOptions({
  schemaOptions: { timestamps: true },
  options: { allowMixed: Severity.ALLOW },
})                                         
@index({ city: 1, area: 1 })
@index({ "inventory.type": 1 })
@index({ avgRating: -1 }) // For "Top Rated" sorting
@index({ coordinates: "2dsphere" }) // For "Near Me" map searches
export class CoworkingSpace {
  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true })
  public address!: string;

  @prop({ required: true, index: true })
  public city!: string;

  @prop({ required: true, index: true })
  public area!: string;

  @prop({ _id: false })
  public coordinates?: { lat: number; lng: number };

  // Flexible Inventory & Other Options
  @prop({ type: () => [InventoryItem], _id: false })
  public inventory!: InventoryItem[];

  @prop({ type: () => [FacilityItem], _id: false })
  public facilities!: FacilityItem[];

  @prop({ type: () => [String] })
  public amenities!: string[];

  // Denormalized Ratings (Syncs with Review Schema)
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
