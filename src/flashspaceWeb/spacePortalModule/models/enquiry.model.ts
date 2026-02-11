import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";

export enum EnquiryStatus {
  NEW = "NEW",
  IN_PROGRESS = "IN_PROGRESS",
  CONVERTED = "CONVERTED",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ clientName: 1 })
@index({ companyName: 1 })
@index({ email: 1 })
@index({ phone: 1 })
@index({ status: 1 })
@index({ createdAt: -1 })
@index({ isDeleted: 1 })
export class SpacePortalEnquiry {
  @prop({ required: true, trim: true })
  public clientName!: string;

  @prop({ required: true, trim: true })
  public companyName!: string;

  @prop({ required: true, trim: true })
  public phone!: string;

  @prop({ required: true, trim: true, lowercase: true })
  public email!: string;

  @prop({ required: true, trim: true })
  public requestedPlan!: string;

  @prop({ required: true, trim: true })
  public requestedSpace!: string;

  @prop({ required: true, enum: EnquiryStatus, default: EnquiryStatus.NEW })
  public status!: EnquiryStatus;

  @prop({ default: false })
  public isDeleted?: boolean;
}

export const SpacePortalEnquiryModel = getModelForClass(SpacePortalEnquiry);
