import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";
import { Property } from "../propertyModule/property.model";
import { SpaceApprovalStatus } from "../shared/enums/spaceApproval.enum";

@modelOptions({
  schemaOptions: { timestamps: true },
})
export class VirtualOffice {
  @prop({ ref: () => Property, required: true })
  public property!: Ref<Property>;

  @prop({
    type: () => String,
    enum: SpaceApprovalStatus,
    default: SpaceApprovalStatus.DRAFT,
  })
  public approvalStatus!: SpaceApprovalStatus;

  // --- Split Pricing: GST Plan ---
  @prop({ required: false })
  public partnerGstPricePerYear?: number;

  @prop({ required: false })
  public adminMarkupGstPerYear?: number;

  @prop({ required: false })
  public finalGstPricePerYear?: number; // Calculated virtual field equivalent

  // --- Split Pricing: Mailing Plan ---
  @prop({ required: false })
  public partnerMailingPricePerYear?: number;

  @prop({ required: false })
  public adminMarkupMailingPerYear?: number;

  @prop({ required: false })
  public finalMailingPricePerYear?: number;

  // --- Split Pricing: Business Registration Plan ---
  @prop({ required: false })
  public partnerBrPricePerYear?: number;

  @prop({ required: false })
  public adminMarkupBrPerYear?: number;

  @prop({ required: false })
  public finalBrPricePerYear?: number;

  @prop({ required: true, default: 0 })
  public avgRating!: number;

  @prop({ required: true, default: 0 })
  public totalReviews!: number;

  @prop({ type: () => [String], default: [] })
  public amenities?: string[];

  @prop({ default: false })
  public popular!: boolean;

  @prop({ default: false })
  public sponsored!: boolean;

  @prop({ default: false })
  public isDeleted?: boolean;

  @prop({ default: false })
  public isActive!: boolean;

  @prop({ ref: () => User, required: true })
  public partner!: Ref<User>;
}

export const VirtualOfficeModel = getModelForClass(VirtualOffice);
