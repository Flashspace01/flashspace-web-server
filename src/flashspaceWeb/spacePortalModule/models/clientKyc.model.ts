import { prop, getModelForClass, modelOptions, index, Ref } from "@typegoose/typegoose";
import { SpacePortalClient } from "./client.model";

export enum ClientKycStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export enum ClientKycDocumentType {
  PAN = "PAN",
  GST = "GST",
  AADHAR = "AADHAR",
  OTHER = "OTHER",
}

class ClientKycDocument {
  @prop({ required: true, enum: ClientKycDocumentType })
  public type!: ClientKycDocumentType;

  @prop({ required: true, trim: true })
  public fileUrl!: string;

  @prop({ required: true })
  public uploadedAt!: Date;
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ client: 1 })
@index({ status: 1 })
@index({ isDeleted: 1 })
export class SpacePortalClientKyc {
  @prop({ ref: () => SpacePortalClient, required: true })
  public client!: Ref<SpacePortalClient>;

  @prop({ required: true, enum: ClientKycStatus })
  public status!: ClientKycStatus;

  @prop({ type: () => [ClientKycDocument], default: [] })
  public documents?: ClientKycDocument[];

  @prop({ default: false })
  public isDeleted?: boolean;
}

export const SpacePortalClientKycModel = getModelForClass(SpacePortalClientKyc);
