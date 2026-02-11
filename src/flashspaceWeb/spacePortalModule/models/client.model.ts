import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";

export enum ClientStatus {
  ACTIVE = "ACTIVE",
  EXPIRING_SOON = "EXPIRING_SOON",
  INACTIVE = "INACTIVE",
}

export enum KycStatus {
  VERIFIED = "VERIFIED",
  PENDING = "PENDING",
}

export enum ClientPlan {
  VIRTUAL_OFFICE_PREMIUM = "Virtual Office Premium",
  VIRTUAL_OFFICE_STANDARD = "Virtual Office Standard",
  TEAM_SPACE = "Team Space",
  HOT_DESK_MONTHLY = "Hot Desk Monthly",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ companyName: 1 })
@index({ contactName: 1 })
@index({ space: 1 })
@index({ status: 1 })
@index({ kycStatus: 1 })
@index({ isDeleted: 1 })
export class SpacePortalClient {
  @prop({ required: true, trim: true })
  public companyName!: string;

  @prop({ required: true, trim: true })
  public contactName!: string;

  @prop({ required: true, trim: true, lowercase: true })
  public email!: string;

  @prop({ required: true, trim: true })
  public phone!: string;

  @prop({ required: true, enum: ClientPlan })
  public plan!: ClientPlan;

  @prop({ required: true, trim: true })
  public space!: string;

  @prop({ required: true })
  public startDate!: Date;

  @prop({ required: true })
  public endDate!: Date;

  @prop({ required: true, enum: ClientStatus })
  public status!: ClientStatus;

  @prop({ required: true, enum: KycStatus })
  public kycStatus!: KycStatus;

  @prop({ default: false })
  public isDeleted?: boolean;
}

export const SpacePortalClientModel = getModelForClass(SpacePortalClient);
