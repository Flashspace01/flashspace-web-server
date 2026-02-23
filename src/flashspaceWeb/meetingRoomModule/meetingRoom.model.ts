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

// --- ADDED: Consistent Operating Hours ---
class OperatingHours {
  @prop({ required: true, trim: true })
  public openTime!: string;

  @prop({ required: true, trim: true })
  public closeTime!: string;

  @prop({ type: () => [String], required: true })
  public daysOpen!: string[];
}

export enum MeetingRoomType {
  MEETING_ROOM = "meeting_room",
  BOARD_ROOM = "board_room",
  CONFERENCE_ROOM = "conference_room",
  OTHER = "other",
}

@modelOptions({
  schemaOptions: { timestamps: true },
  options: { allowMixed: Severity.ALLOW },
})
@index({ city: 1, area: 1 })
@index({ type: 1 })
@index({ avgRating: -1 })
@index({ popular: 1 })
@index({ location: "2dsphere" })
export class MeetingRoom {
  @prop({ ref: () => Property, required: true })
  public property!: Ref<Property>;

  @prop({ required: true })
  public pricePerHour!: number;

  @prop({ required: false })
  public pricePerDay?: number; // ADDED

  // --- ADDED: Timing & Booking Rules ---
  @prop({ type: () => OperatingHours, _id: false })
  public operatingHours?: OperatingHours;

  @prop({ required: false, default: 1 })
  public minBookingHours?: number;
  // -------------------------------------

  @prop({ required: true })
  public capacity!: number;

  @prop({ required: true, enum: MeetingRoomType })
  public type!: MeetingRoomType;

  @prop({ default: 0 })
  public avgRating!: number;

  @prop({ default: 0 })
  public totalReviews!: number;

  @prop({ default: false })
  public sponsored!: boolean;

  @prop({ default: false })
  public popular!: boolean;

  @prop({ default: true })
  public isActive!: boolean;

  @prop({ default: false })
  public isDeleted!: boolean;

  @prop({ ref: () => User, required: true })
  public partner!: Ref<User>;
}

export const MeetingRoomModel = getModelForClass(MeetingRoom);
