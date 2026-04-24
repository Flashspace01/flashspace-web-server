import { getModelForClass, ModelOptions, prop } from "@typegoose/typegoose";

export type KycDecisionStatus =
  | "not_started"
  | "pending"
  | "approved"
  | "rejected";

@ModelOptions({
  schemaOptions: { timestamps: true, collection: "space_user_kyc" },
})
export class SpaceUserKyc {
  // Link to the user (space partner / space user)
  @prop({ required: true })
  public userId!: string;

  // ------------------- PERSONAL INFORMATION -------------------
  @prop({ required: true, trim: true })
  public fullName!: string;

  @prop({ required: true, lowercase: true, trim: true })
  public email!: string;

  @prop({ required: true, trim: true })
  public phoneNumber!: string; // store as string to preserve leading zeros

  @prop({ required: true })
  public dateOfBirth!: Date;

  @prop({ required: true, trim: true })
  public aadhaarNumber!: string;

  @prop({ required: true, trim: true })
  public panNumber!: string;

  // ------------------- DOCUMENT REFERENCES -------------------
  // File paths / URLs for uploaded assets

  @prop({ trim: true })
  public aadhaarImageUrl?: string;

  @prop({ trim: true })
  public panImageUrl?: string;

  // ------------------- BUSINESS INFORMATION -------------------
  @prop({ trim: true })
  public companyName?: string;

  @prop({ trim: true })
  public companyType?: string;

  @prop({ trim: true })
  public industry?: string;

  @prop({ trim: true })
  public gstNumber?: string;

  @prop({ trim: true })
  public cinRegistrationNumber?: string;

  @prop({ trim: true })
  public registeredAddress?: string;

  @prop({ trim: true })
  public contactPhone?: string;

  // ------------------- BANK DETAILS -------------------
  @prop({ trim: true })
  public accountHolderName?: string;

  @prop({ trim: true })
  public bankName?: string;

  @prop({ trim: true })
  public accountNumber?: string;

  @prop({ trim: true })
  public ifscCode?: string;

  @prop({ trim: true })
  public branch?: string;

  @prop({ trim: true })
  public accountType?: string;

  @prop({
    enum: ["not_started", "pending", "approved", "rejected"],
    default: "not_started",
  })
  public bankStatus!: KycDecisionStatus;

  @prop({ trim: true })
  public bankRejectMessage?: string;

  // ------------------- COMPANY PARTNERS -------------------
  @prop({ type: () => [String], default: [] })
  public companyPartners!: string[];

  // ------------------- PER-DOCUMENT REVIEW STATUS -------------------
  // Existing
  @prop({
    enum: ["not_started", "pending", "approved", "rejected"],
    default: "not_started",
  })
  public aadhaarImageStatus!: KycDecisionStatus;

  @prop({ trim: true })
  public aadhaarImageRejectMessage?: string;

  @prop({
    enum: ["not_started", "pending", "approved", "rejected"],
    default: "not_started",
  })
  public panImageStatus!: KycDecisionStatus;

  @prop({ trim: true })
  public panImageRejectMessage?: string;

  // New Documents
  @prop({ trim: true })
  public companyRegistrationUrl?: string;

  @prop({
    enum: ["not_started", "pending", "approved", "rejected"],
    default: "not_started",
  })
  public companyRegistrationStatus!: KycDecisionStatus;

  @prop({ trim: true })
  public companyRegistrationRejectMessage?: string;

  @prop({ trim: true })
  public gstCertificateUrl?: string;

  @prop({
    enum: ["not_started", "pending", "approved", "rejected"],
    default: "not_started",
  })
  public gstCertificateStatus!: KycDecisionStatus;

  @prop({ trim: true })
  public gstCertificateRejectMessage?: string;

  @prop({ trim: true })
  public addressProofUrl?: string;

  @prop({
    enum: ["not_started", "pending", "approved", "rejected"],
    default: "not_started",
  })
  public addressProofStatus!: KycDecisionStatus;

  @prop({ trim: true })
  public addressProofRejectMessage?: string;

  @prop({ trim: true })
  public bankDetailsProofUrl?: string;

  @prop({
    enum: ["not_started", "pending", "approved", "rejected"],
    default: "not_started",
  })
  public bankDetailsProofStatus!: KycDecisionStatus;

  @prop({ trim: true })
  public bankDetailsProofRejectMessage?: string;

  // ------------------- VIDEO KYC -------------------
  @prop({ trim: true })
  public videoKycUrl?: string;

  @prop({
    enum: ["not_started", "pending", "approved", "rejected"],
    default: "not_started",
  })
  public videoKycStatus!: KycDecisionStatus;

  @prop({ trim: true })
  public videoKycRejectMessage?: string;

  // ------------------- OVERALL KYC DECISION -------------------

  @prop({
    enum: ["not_started", "pending", "approved", "rejected"],
    default: "not_started",
  })
  public overallStatus!: KycDecisionStatus;

  @prop({ trim: true })
  public overallRejectMessage?: string;

  @prop({
    enum: ["not_started", "pending", "approved", "rejected"],
    default: "not_started",
  })
  public kycStatus!: KycDecisionStatus;
}

export const SpaceUserKycModel = getModelForClass(SpaceUserKyc);
