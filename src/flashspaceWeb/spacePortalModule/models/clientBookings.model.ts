import { prop, getModelForClass, modelOptions, index, Ref } from "@typegoose/typegoose";
import { SpacePortalClient } from "./client.model";

export enum ClientBookingStatus {
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  PENDING = "PENDING",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ client: 1 })
@index({ date: 1 })
@index({ status: 1 })
@index({ isDeleted: 1 })
export class SpacePortalClientBooking {
  @prop({ ref: () => SpacePortalClient, required: true })
  public client!: Ref<SpacePortalClient>;

  @prop({ required: true })
  public date!: Date;

  @prop({ required: true, trim: true })
  public slot!: string;

  @prop({ required: true, enum: ClientBookingStatus })
  public status!: ClientBookingStatus;

  @prop({ required: true, min: 0 })
  public amount!: number;

  @prop({ default: false })
  public isDeleted?: boolean;
}

export const SpacePortalClientBookingModel = getModelForClass(
  SpacePortalClientBooking
);
