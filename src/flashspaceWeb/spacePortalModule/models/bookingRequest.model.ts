import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";

export enum BookingRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  DECLINED = "DECLINED",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ clientName: 1 })
@index({ space: 1 })
@index({ requestedDate: 1 })
@index({ status: 1 })
@index({ createdAt: -1 })
@index({ isDeleted: 1 })
export class SpacePortalBookingRequest {
  @prop({ required: true, trim: true })
  public clientName!: string;

  @prop({ required: true, trim: true })
  public space!: string;

  @prop({ required: true })
  public requestedDate!: Date;

  @prop({ required: true, trim: true })
  public requestedTime!: string;

  @prop({ required: true, enum: BookingRequestStatus, default: BookingRequestStatus.PENDING })
  public status!: BookingRequestStatus;

  @prop({ default: false })
  public isDeleted?: boolean;
}

export const SpacePortalBookingRequestModel = getModelForClass(SpacePortalBookingRequest);
