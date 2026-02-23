import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";
import { GeoLocation } from "../shared/geolocation.schema";

export enum KYCStatus {
  APPROVED = "approved",
  REJECTED = "rejected",
  PENDING = "pending",
  NOT_STARTED = "not_started",
}

@modelOptions({
  schemaOptions: { timestamps: true },
})
@index({ city: 1, area: 1 })
@index({ location: "2dsphere" })
export class Property {
  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true })
  public address!: string;

  @prop({ required: true, trim: true })
  public city!: string;

  @prop({ required: true, trim: true })
  public area!: string;

  @prop({ required: true, type: () => [String] })
  public features!: string[];

  @prop({ type: () => GeoLocation, _id: false })
  public location?: GeoLocation;

  @prop({ type: () => [String], default: [] })
  public images!: string[];

  @prop({ default: KYCStatus.NOT_STARTED, enum: KYCStatus })
  public kycStatus?: KYCStatus;

  @prop({ ref: () => User, required: true })
  public partner!: Ref<User>;
}

export const PropertyModel = getModelForClass(Property);
