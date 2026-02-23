import {
  prop,
  getModelForClass,
  Ref,
  modelOptions,
  index,
} from "@typegoose/typegoose";
import { Types } from "mongoose";
import { User } from "../authModule/models/user.model";
import { CoworkingSpace } from "../coworkingSpaceModule/coworkingSpace.model";

@modelOptions({ schemaOptions: { timestamps: true } })
@index({ space: 1, startTime: 1, endTime: 1, status: 1 })
@index({ seatIds: 1 })
export class SeatBooking {
  @prop({ ref: () => CoworkingSpace, required: true })
  public space!: Ref<CoworkingSpace>;

  @prop({ ref: () => User, required: true })
  public user!: Ref<User>;

  @prop({ required: true })
  public startTime!: Date;

  @prop({ required: true })
  public endTime!: Date;

  // References to seat sub‑documents (ObjectIds)
  @prop({ type: () => [Types.ObjectId], required: true })
  public seatIds!: Types.ObjectId[];

  @prop({ required: true })
  public totalAmount!: number;

  @prop({
    enum: ["pending", "confirmed", "cancelled", "expired"],
    default: "pending",
  })
  public status!: string;

  @prop()
  public holdExpiresAt?: Date; // for pending bookings

  @prop()
  public paymentId?: string;
}

export const SeatBookingModel = getModelForClass(SeatBooking);
