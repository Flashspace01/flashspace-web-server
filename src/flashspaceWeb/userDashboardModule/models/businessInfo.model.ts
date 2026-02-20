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
export class BusinessInfo {
  @prop({ ref: () => User, required: true })
  user!: Ref<User>;

  @prop({ ref: () => KYCDocument })
  kycProfile?: Ref<KYCDocument>;

  @prop()
  profileName?: string;

  @prop({ required: true })
  companyName!: string;

  @prop()
  companyType?: string;

  @prop()
  gstNumber?: string;

  @prop()
  panNumber?: string;

  @prop()
  cinNumber?: string;

  @prop()
  registeredAddress?: string;

  @prop()
  industry?: string;

  @prop({ default: false })
  isDeleted?: boolean;

  @prop({
    enum: ["in_progress", "pending", "approved", "rejected"],
    default: "in_progress",
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

export const BusinessInfoModel = getModelForClass(BusinessInfo);
