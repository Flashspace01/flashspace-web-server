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
import { SpaceApprovalStatus } from "../shared/enums/spaceApproval.enum";
import { OperatingHours } from "../shared/schemas/operatingHours.schema";

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
@index({ type: 1 })
@index({ avgRating: -1 })
@index({ popular: 1 })
export class MeetingRoom {
  @prop({ ref: () => Property, required: true })
  public property!: Ref<Property>;

  @prop({
    type: () => String,
    enum: SpaceApprovalStatus,
    default: SpaceApprovalStatus.DRAFT,
  })
  public approvalStatus!: SpaceApprovalStatus;

  // --- Split Pricing (Per Hour) ---
  @prop({ required: true })
  public partnerPricePerHour!: number;

  @prop({ required: false })
  public adminMarkupPerHour!: number;

  @prop({ required: false })
  public finalPricePerHour!: number;

  // --- Split Pricing (Per Day) ---
  @prop({ required: false })
  public partnerPricePerDay?: number;

  @prop({ required: false })
  public adminMarkupPerDay?: number;

  @prop({ required: false })
  public finalPricePerDay?: number;

  // --- ADDED: Timing & Booking Rules ---
  @prop({ type: () => OperatingHours, _id: false, required: true })
  public operatingHours!: OperatingHours;

  @prop({ required: false, default: 1 })
  public minBookingHours?: number;
  // -------------------------------------

  @prop({ required: true })
  public capacity!: number;

  @prop({ type: () => String, required: true, enum: MeetingRoomType })
  public type!: MeetingRoomType;

  @prop({ default: 0 })
  public avgRating!: number;

  @prop({ default: 0 })
  public totalReviews!: number;

  @prop({ default: false })
  public sponsored!: boolean;

  @prop({ default: false })
  public popular!: boolean;

  @prop({ type: () => [String], default: [] })
  public amenities?: string[];

  @prop({ type: () => [String], default: [] })
  public images?: string[];

  @prop({ default: false })
  public isActive!: boolean;

  @prop({ default: false })
  public isDeleted!: boolean;

  @prop({ ref: () => User, required: true })
  public partner!: Ref<User>;
}

export const MeetingRoomModel = getModelForClass(MeetingRoom);
