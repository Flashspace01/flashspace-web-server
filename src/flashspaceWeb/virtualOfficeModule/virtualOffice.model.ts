import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";
import { GeoLocation } from "../shared/geolocation.schema"; 

@modelOptions({
  schemaOptions: { timestamps: true },
})
@index({ city: 1, area: 1 }) 
@index({ isDeleted: 1, isActive: 1 }) 
@index({ popular: 1, avgRating: -1 }) 
@index({ location: "2dsphere" }) 
export class VirtualOffice {
  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true })
  public address!: string;

  @prop({ required: true, trim: true })
  public city!: string;

  @prop({ required: true, trim: true })
  public area!: string;

  // --- UPDATED: Explicitly named as Per Year ---
  @prop({ required: false })
  public gstPlanPricePerYear?: number;

  @prop({ required: false })
  public mailingPlanPricePerYear?: number;

  @prop({ required: false })
  public brPlanPricePerYear?: number;
  // ---------------------------------------------

  @prop({ required: true, default: 0 })
  public avgRating!: number;

  @prop({ required: true, default: 0 })
  public totalReviews!: number;

  @prop({ required: true, type: () => [String] })
  public features!: string[];

  @prop({ required: true, default: "Available Now" })
  public availability!: string;

  @prop({ default: false })
  public popular!: boolean;

  @prop({ default: false })
  public sponsored!: boolean;

  @prop({ type: () => GeoLocation, _id: false })
  public location?: GeoLocation;

  @prop({ type: () => [String], default: [] })
  public images!: string[];

  @prop({ default: false })
  public isDeleted?: boolean;

  @prop({ default: true })
  public isActive?: boolean;

  @prop({ ref: () => User, required: true })
  public partner!: Ref<User>;
}

export const VirtualOfficeModel = getModelForClass(VirtualOffice);