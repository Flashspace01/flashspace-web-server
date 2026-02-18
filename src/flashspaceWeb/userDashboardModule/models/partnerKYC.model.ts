import {
  prop,
  getModelForClass,
  Ref,
  modelOptions,
  Severity,
} from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";
import { KYCDocument, KYCDocumentItem } from "./kyc.model";

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class PartnerKYC {
  @prop({ ref: () => User, required: true })
  user!: Ref<User>;

  @prop({ ref: () => KYCDocument, required: true })
  kycProfile!: Ref<KYCDocument>;

  @prop({ required: true })
  fullName!: string;

  @prop({ required: true })
  email!: string;

  @prop({ required: true })
  phone!: string;

  @prop()
  panNumber?: string;

  @prop()
  aadhaarNumber?: string;

  @prop()
  dob?: Date;

  @prop()
  address?: string;

  @prop({ default: false })
  isDeleted?: boolean;

  @prop({
<<<<<<< HEAD
    enum: ["in_progress", "pending", "approved", "rejected"],
    default: "in_progress",
=======
    enum: ["pending", "approved", "rejected"],
    default: "pending",
>>>>>>> b1c89c47e11a3f785d0330572d3e731ac812e2f4
  })
  status?: string;

  @prop()
  rejectionReason?: string;

  @prop({ default: Date.now })
  createdAt?: Date;

  @prop({ type: () => [KYCDocumentItem], default: [] })
  documents?: KYCDocumentItem[];

  @prop({ default: Date.now })
  updatedAt?: Date;
}

export const PartnerKYCModel = getModelForClass(PartnerKYC);
