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

  @prop()
  dateOfBirth?: Date;

  @prop()
  aadhaarNumber?: string;

  @prop()
  panNumber?: string;
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

  @prop({ type: () => [String], default: [] })
  partners?: string[]; // Array of KYCDocument IDs (Individual profiles)
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
  profileName?: string; // e.g., "TechCorp Pvt Ltd" or "John Doe (Personal)"

  @prop({ type: () => [String], default: [] })
  linkedBookings?: string[]; // Array of booking IDs using this profile

  @prop({ type: () => PersonalInfo })
  personalInfo?: PersonalInfo;

  @prop({ type: () => BusinessInfo })
  businessInfo?: BusinessInfo;

  @prop({ enum: ["individual", "business"], default: "individual" })
  kycType?: string;

  @prop({ default: false })
  isPartner?: boolean; // True if this is a partner profile (individual with different name)

  @prop({ type: () => [KYCDocumentItem], default: [] })
  documents?: KYCDocumentItem[];

  @prop({
    enum: ["not_started", "in_progress", "pending", "approved", "rejected", "resubmit"],
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
