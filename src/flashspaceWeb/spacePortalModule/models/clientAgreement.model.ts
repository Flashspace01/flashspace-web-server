import { prop, getModelForClass, modelOptions, index, Ref } from "@typegoose/typegoose";
import { SpacePortalClient } from "./client.model";

export enum ClientAgreementStatus {
  PENDING = "PENDING",
  SIGNED = "SIGNED",
  EXPIRED = "EXPIRED",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ client: 1 })
@index({ status: 1 })
@index({ isDeleted: 1 })
export class SpacePortalClientAgreement {
  @prop({ ref: () => SpacePortalClient, required: true })
  public client!: Ref<SpacePortalClient>;

  @prop({ required: true, enum: ClientAgreementStatus })
  public status!: ClientAgreementStatus;

  @prop({ required: true, trim: true })
  public agreementUrl!: string;

  @prop()
  public signedAt?: Date;

  @prop()
  public validTill?: Date;

  @prop({ default: false })
  public isDeleted?: boolean;
}

export const SpacePortalClientAgreementModel = getModelForClass(
  SpacePortalClientAgreement
);
