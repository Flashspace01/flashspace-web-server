import { prop, getModelForClass, Ref, modelOptions, Severity } from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";

class PersonalInfo {
  @prop()
  fullName?: string;

  @prop()
  email?: string;

  @prop()
  phone?: string;

  @prop({ default: false })
  verified?: boolean;
}

class BusinessInfo {
  @prop()
  companyName?: string;

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

  @prop({ default: false })
  verified?: boolean;
}

class KYCDocumentItem {
  @prop({ required: true })
  type!: string;

  @prop({ required: true })
  name!: string;

  @prop()
  fileUrl?: string;

  @prop({ enum: ["pending", "approved", "rejected"], default: "pending" })
  status?: string;

  @prop()
  rejectionReason?: string;

  @prop()
  uploadedAt?: Date;

  @prop()
  verifiedAt?: Date;

  @prop({ ref: () => User })
  verifiedBy?: Ref<User>;
}

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class KYCDocument {
  @prop({ ref: () => User, required: true })
  user!: Ref<User>;

  @prop()
  bookingId?: string;

  @prop({ type: () => PersonalInfo })
  personalInfo?: PersonalInfo;

  @prop({ type: () => BusinessInfo })
  businessInfo?: BusinessInfo;

  @prop({ type: () => [KYCDocumentItem], default: [] })
  documents?: KYCDocumentItem[];

  @prop({
    enum: ["not_started", "pending", "approved", "rejected", "resubmit"],
    default: "not_started",
  })
  overallStatus?: string;

  @prop({ default: 0, min: 0, max: 100 })
  progress?: number;

  @prop({ default: false })
  isDeleted?: boolean;

  @prop({ default: Date.now })
  createdAt?: Date;

  @prop({ default: Date.now })
  updatedAt?: Date;
}

export const KYCDocumentModel = getModelForClass(KYCDocument);
