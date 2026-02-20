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

class OperatingHours {
  @prop({ required: true, trim: true })
  public openTime!: string; // e.g., "09:00"

  @prop({ required: true, trim: true })
  public closeTime!: string; // e.g., "22:00"

  @prop({ type: () => [String], required: true })
  public daysOpen!: string[]; 
}

export enum EventSpaceType {
  CONFERENCE_HALL = "conference_hall",
  SEMINAR_ROOM = "seminar_room",
  TRAINING_ROOM = "training_room",
  WORKSHOP_VENUE = "workshop_venue",
  PRODUCT_LAUNCH_SPACE = "product_launch_space",
  EVENT_HALL = "event_hall",
  NETWORKING_EVENT_SPACE = "networking_event_space",
  OTHER = "other",
}

@modelOptions({
  schemaOptions: { timestamps: true },
  options: { allowMixed: Severity.ALLOW },
})
@index({ city: 1, area: 1 })
@index({ type: 1 })
@index({ pricePerHour: 1 })
@index({ popular: 1 })
@index({ location: "2dsphere" })
export class EventSpace {
  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true })
  public address!: string;

  @prop({ required: true, index: true })
  public city!: string;

  @prop({ required: true, index: true })
  public area!: string;

  @prop({ required: true })
  public pricePerHour!: number;

  @prop({ required: false })
  public pricePerDay?: number; // ADDED: Highly recommended for Event Spaces

  // --- ADDED: Timing & Booking Rules ---
  @prop({ type: () => OperatingHours, _id: false })
  public operatingHours?: OperatingHours;

  @prop({ required: false, default: 1 })
  public minBookingHours?: number; // e.g., requires at least a 2-hour booking
  // -------------------------------------

  @prop({ required: true, enum: EventSpaceType })
  public type!: EventSpaceType;

  @prop({ required: false })
  public customType?: string;

  @prop({ type: () => GeoLocation, _id: false })
  public location?: GeoLocation;

  @prop({ type: () => [String] })
  public amenities!: string[];

  @prop({ default: 0 })
  public capacity?: number;

  @prop({ default: false })
  public sponsored!: boolean;

  @prop({ default: false })
  public popular!: boolean;

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

export const EventSpaceModel = getModelForClass(EventSpace);