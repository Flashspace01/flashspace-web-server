import mongoose, { Schema, Document } from "mongoose";

export interface IMail extends Document {
  mailId: string;
  client: string;
  clientEmail: string;
  sender: string;
  type:
    | "Letter"
    | "Parcel"
    | "Government Document"
    | "Package"
    | "Legal Notice"
    | "Other";
  space: string;
  received: Date;
  trackingNumber?: string;
  photoUrl?: string;
  notifyClient: boolean;
  status: "Pending Action" | "Forwarded" | "Collected";
  updatedAt: Date;
}

const MailSchema: Schema = new Schema(
  {
    mailId: { type: String, required: true, unique: true },
    client: { type: String, required: true },
    clientEmail: { type: String, required: true },
    sender: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "Letter",
        "Parcel",
        "Government Document",
        "Package",
        "Legal Notice",
        "Other",
      ],
    },
    space: { type: String, required: true },
    received: { type: Date, default: Date.now },
    trackingNumber: { type: String },
    photoUrl: { type: String },
    notifyClient: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["Pending Action", "Forwarded", "Collected"],
      default: "Pending Action",
    },
  },
  { timestamps: true },
);

export default mongoose.model<IMail>("Mail", MailSchema);
