import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
  Severity,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";
import { Property } from "../propertyModule/property.model";

export class Seat {
  @prop({ required: true })
  public seatNumber!: string;

  @prop({ default: true })
  public isActive!: boolean;
}

export class Table {
  @prop({ required: true })
  public tableNumber!: string;

  @prop({ type: () => [Seat] })
  public seats!: Seat[];
}

export class Floor {
  @prop({ required: true })
  public floorNumber!: number;

  @prop()
  public name?: string;

  @prop({ type: () => [Table] })
  public tables!: Table[];
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
@index({ popular: 1 })
@index({ avgRating: -1 })
@index({ location: "2dsphere" })
export class CoworkingSpace {
  @prop({ ref: () => Property, required: true })
  public property!: Ref<Property>;

  @prop({ required: true })
  public capacity!: number;

  @prop({ default: false })
  public sponsored!: boolean;

  @prop({ default: false })
  public popular!: boolean;

  // --- Long-Term Pricing ---
  @prop({ required: false, default: 0 })
  public pricePerMonth!: number;

  // --- Short-Term "Day Pass" Pricing ---
  @prop({ required: false })
  public pricePerDay!: number;

  @prop({ type: () => [Floor] })
  public floors!: Floor[];

  @prop({ type: () => OperatingHours, _id: false })
  public operatingHours!: OperatingHours;

  @prop({ default: 0 })
  public avgRating!: number;

  @prop({ default: 0 })
  public totalReviews!: number;

  @prop({ default: true })
  public isActive!: boolean;

  @prop({ default: false })
  public isDeleted!: boolean;

  @prop({ ref: () => User, required: true })
  public partner!: Ref<User>;
}

export const CoworkingSpaceModel = getModelForClass(CoworkingSpace);
