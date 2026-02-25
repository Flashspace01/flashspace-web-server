import { getModelForClass, ModelOptions, prop } from "@typegoose/typegoose";

export type KycDecisionStatus = "pending" | "approved" | "rejected";

@ModelOptions({ schemaOptions: { timestamps: true, collection: "space_user_kyc" } })
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

	// ------------------- COMPANY PARTNERS -------------------
	@prop({ type: () => [String], default: [] })
	public companyPartners!: string[];

	// ------------------- PER-DOCUMENT REVIEW STATUS -------------------

	@prop({ enum: ["pending", "approved", "rejected"], default: "pending" })
	public aadhaarImageStatus!: KycDecisionStatus;

	@prop({ trim: true })
	public aadhaarImageRejectMessage?: string;

	@prop({ enum: ["pending", "approved", "rejected"], default: "pending" })
	public panImageStatus!: KycDecisionStatus;

	@prop({ trim: true })
	public panImageRejectMessage?: string;

	// ------------------- OVERALL KYC DECISION -------------------

	@prop({ enum: ["pending", "approved", "rejected"], default: "pending" })
	public overallStatus!: KycDecisionStatus;

	@prop({ trim: true })
	public overallRejectMessage?: string;
}

export const SpaceUserKycModel = getModelForClass(SpaceUserKyc);

