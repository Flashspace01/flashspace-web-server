import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";
import { Property } from "../propertyModule/property.model";

@modelOptions({
  schemaOptions: { timestamps: true },
})
export class VirtualOffice {
  @prop({ ref: () => Property, required: true })
  public property!: Ref<Property>;

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

  @prop({ required: true, default: "Available Now" })
  public availability!: string;

  @prop({ default: false })
  public popular!: boolean;

  @prop({ default: false })
  public sponsored!: boolean;

  @prop({ default: false })
  public isDeleted?: boolean;

  @prop({ default: true })
  public isActive?: boolean;

  @prop({ ref: () => User, required: true })
  public partner!: Ref<User>;
}

export const VirtualOfficeModel = getModelForClass(VirtualOffice);
