import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";

export enum CalendarBookingStatus {
  CONFIRMED = "CONFIRMED",
  PENDING = "PENDING",
  CANCELLED = "CANCELLED",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ space: 1 })
@index({ clientName: 1 })
@index({ startTime: 1 })
@index({ planName: 1 })
@index({ status: 1 })
@index({ isDeleted: 1 })
export class SpacePortalCalendarBooking {
  @prop({ required: true, trim: true })
  public clientName!: string;

  @prop({ required: true, trim: true })
  public space!: string;

  @prop({ required: true })
  public startTime!: Date;

  @prop({ required: true }) 
  public endTime!: Date;

  @prop({ trim: true })
  public planName?: string;

  @prop({ min: 0 })
  public amount?: number;

  @prop({ required: true, enum: CalendarBookingStatus })
  public status!: CalendarBookingStatus;

  @prop({ default: false })
  public isDeleted?: boolean;
}

export const SpacePortalCalendarBookingModel = getModelForClass(
  SpacePortalCalendarBooking
);
