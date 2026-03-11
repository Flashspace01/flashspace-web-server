import mongoose, { Schema, Document } from "mongoose";

export enum StaffRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
}

export interface IStaff extends Document {
  partnerId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: StaffRole;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema: Schema = new Schema(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(StaffRole),
      default: StaffRole.STAFF,
    },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// Index for faster lookups by partner
StaffSchema.index({ partnerId: 1, isDeleted: 1 });
// Email should be unique per partner context (or globally, but let's stick to unique email for now)
StaffSchema.index({ email: 1, isDeleted: 1 }, { unique: true });

export const StaffModel = mongoose.model<IStaff>("Staff", StaffSchema);
