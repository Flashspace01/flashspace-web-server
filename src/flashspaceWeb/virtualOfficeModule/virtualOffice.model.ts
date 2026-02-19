import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ city: 1, area: 1 }) // Location-based searches
@index({ isDeleted: 1, isActive: 1 }) // Filter active offices
@index({ popular: 1, avgRating: -1 }) // Featured/popular offices
@index({ coordinates: "2dsphere" }) // Geospatial queries
export class VirtualOffice {
  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true })
  public address!: string;

  @prop({ required: true, trim: true })
  public city!: string;

  @prop({ required: true, trim: true })
  public area!: string;

  @prop({ required: false })
  public gstPlanPrice!: string;

  @prop({ required: false })
  public mailingPlanPrice!: string;

  @prop({ required: false })
  public brPlanPrice!: string;

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
  public isSponsored!: boolean;

  @prop({ _id: false })
  public coordinates?: {
    lat: number;
    lng: number;
  };

  @prop({ type: () => [String], default: [] })
  public images!: string[];

  @prop({ default: false })
  public isDeleted?: boolean;

  @prop({ default: true })
  public isActive?: boolean;

  @prop({ ref: () => User, required: true })
  public partner!: Ref<User>;

  @prop({ ref: () => User, default: [] })
  public managers?: Ref<User>[];
}

export const VirtualOfficeModel = getModelForClass(VirtualOffice);
// Schema Updated
