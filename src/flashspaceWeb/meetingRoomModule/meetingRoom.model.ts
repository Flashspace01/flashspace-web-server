import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
  Severity,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";

export enum MeetingRoomType {
  MEETING_ROOM = "meeting_room",
  BOARD_ROOM = "board_room",
  CONFERENCE_ROOM = "conference_room",
  DEPOSITION_ROOM = "deposition_room",
}

@modelOptions({
  schemaOptions: { timestamps: true },
  options: { allowMixed: Severity.ALLOW },
})
@index({ city: 1, area: 1 })
@index({ type: 1 })
@index({ avgRating: -1 }) // For "Top Rated" sorting
@index({ popular: 1 })
@index({ coordinates: "2dsphere" }) // For "Near Me" map searches
export class MeetingRoom {
  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true })
  public address!: string;

  @prop({ required: true, index: true })
  public city!: string;

  @prop({ required: true, index: true })
  public area!: string;

  @prop({ required: true })
  public price!: number;

  @prop({ required: true })
  public capacity!: number;

  @prop({ required: true, enum: MeetingRoomType })
  public type!: MeetingRoomType;

  @prop({ _id: false })
  public coordinates?: { lat: number; lng: number };

  @prop({ type: () => [String] })
  public amenities!: string[];

  @prop({ default: 0 })
  public avgRating!: number;

  @prop({ default: 0 })
  public totalReviews!: number;

  @prop({ type: () => [String], required: true })
  public images!: string[];

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
