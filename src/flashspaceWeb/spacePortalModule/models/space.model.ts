import { prop, getModelForClass, modelOptions, index, Ref } from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";

export enum SpacePortalSpaceStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  MAINTENANCE = "MAINTENANCE",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ city: 1 })
@index({ status: 1 })
@index({ isDeleted: 1 })
export class SpacePortalSpace {
  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true, trim: true })
  public city!: string;

  @prop({ required: true, trim: true })
  public location!: string;

  @prop({ required: true, min: 0 })
  public totalSeats!: number;

  @prop({ required: true, min: 0 })
  public availableSeats!: number;

  @prop({ required: true, min: 0 })
  public meetingRooms!: number;

  @prop({ required: true, min: 0 })
  public cabins!: number;

  @prop({ required: true, enum: SpacePortalSpaceStatus })
  public status!: SpacePortalSpaceStatus;

  @prop({ type: () => [String], default: [] })
  public photos!: string[];

  @prop({ default: false })
  public isDeleted?: boolean;

  // Owner (space partner) reference
  @prop({ ref: () => User, required: true })
  public partner!: Ref<User>;
}

export const SpacePortalSpaceModel = getModelForClass(SpacePortalSpace);
