import {
  prop,
  modelOptions,
  getModelForClass,
  index,
  Severity,
} from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { UserRole } from "./user.model";

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "pending_users",
  },
  options: { allowMixed: Severity.ALLOW },
})
@index({ email: 1 }, { unique: true })
@index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL index for auto-cleanup
export class PendingUser extends TimeStamps {
  @prop({ type: () => String, required: true, trim: true, lowercase: true })
  public email!: string;

  @prop({ type: () => String, required: true, trim: true })
  public fullName!: string;

  @prop({ trim: true })
  public phoneNumber?: string;

  @prop({ type: () => String, required: true, trim: true })
  public password!: string;

  @prop({ type: () => String, enum: UserRole, default: UserRole.USER })
  public role!: UserRole;

  @prop({ required: true })
  public otp!: string;

  @prop({ required: true })
  public otpExpiry!: Date;

  @prop({ default: 0 })
  public otpAttempts!: number;

  @prop({ required: true })
  public expiresAt!: Date; // Record expiry (e.g. 1 hour)
}

export const PendingUserModel = getModelForClass(PendingUser);
