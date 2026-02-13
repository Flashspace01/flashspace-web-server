import mongoose, { Schema, Document } from "mongoose";

export interface IKycPartnerDocuments extends Document {
  user: mongoose.Types.ObjectId;

  // Reference to the individual KYCDocument profile for this partner
  partnerProfileId?: mongoose.Types.ObjectId;

  partnerInfo: {
    fullName: string;
    email: string;
    phone: string;
    panNumber: string;
    aadhaarNumber: string;
    verified: boolean;
  };

  overallStatus: "pending" | "approved" | "rejected";
  progress: number;
  isDeleted: boolean;

  documents: {
    type: "video_kyc" | "pan_card" | "aadhaar" | string;
    name: string;
    fileUrl: string;
    status: "pending" | "approved" | "rejected";
    uploadedAt: Date;
    verifiedAt?: Date;
  }[];

  createdAt: Date;
  updatedAt: Date;
}

const PartnerDocumentSchema = new Schema(
  {
    type: { type: String, required: true },
    name: String,
    fileUrl: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    uploadedAt: { type: Date, default: Date.now },
    verifiedAt: Date,
  },
  { _id: true }
);

const KycPartnerDocumentsSchema = new Schema<IKycPartnerDocuments>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    partnerProfileId: {
      type: Schema.Types.ObjectId,
      ref: "KYCDocument",
    },

    partnerInfo: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      panNumber: { type: String, required: true },
      aadhaarNumber: { type: String, required: true },
      verified: { type: Boolean, default: false },
    },

    overallStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    progress: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },

    documents: [PartnerDocumentSchema],
  },
  { timestamps: true }
);

export default mongoose.model<IKycPartnerDocuments>(
  "KycPartnerDocuments",
  KycPartnerDocumentsSchema
);
