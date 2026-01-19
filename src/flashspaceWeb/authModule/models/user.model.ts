import { prop, modelOptions, getModelForClass, index } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Types } from "mongoose";

export enum AuthProvider {
  LOCAL = "local",
  GOOGLE = "google",
}

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  VENDOR = "vendor",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "users",
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        return ret;
      }
    }
  },
})
@index({ email: 1 }, { unique: true })
@index({ googleId: 1 }, { sparse: true, unique: true })
@index({ isDeleted: 1, isActive: 1 }) // Filter active users efficiently
@index({ role: 1 }) // Role-based access queries
@index({ authProvider: 1 }) // Provider-specific queries
@index({ lastLogin: -1 }) // Recent activity tracking
@index({ emailVerificationOTPExpiry: 1 }, { sparse: true, expireAfterSeconds: 0 }) // Auto-cleanup expired OTPs
@index({ resetPasswordExpiry: 1 }, { sparse: true, expireAfterSeconds: 0 }) // Auto-cleanup expired reset tokens
export class User extends TimeStamps {
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true, lowercase: true })
  public email!: string;

  @prop({ required: true, trim: true })
  public fullName!: string;

  @prop({ trim: true })
  public phoneNumber?: string;

  @prop()
  public profilePicture?: string;

  // Password (only for local auth)
  @prop({ select: false }) // Don't select by default for security
  public password?: string;

  // Google OAuth
  @prop({ sparse: true })
  public googleId?: string;

  // Auth provider
  @prop({ enum: AuthProvider, default: AuthProvider.LOCAL })
  public authProvider!: AuthProvider;

  // User role
  @prop({ enum: UserRole, default: UserRole.USER })
  public role!: UserRole;

  // Account status
  @prop({ default: false })
  public isEmailVerified!: boolean;

  @prop({ default: false })
  public kycVerified!: boolean;


  @prop()
  public emailVerificationToken?: string;

  @prop()
  public emailVerificationExpiry?: Date;

  // OTP Verification (for email and 2FA)
  @prop({ select: false })
  public emailVerificationOTP?: string;

  @prop()
  public emailVerificationOTPExpiry?: Date;

  @prop({ default: 0 })
  public emailVerificationOTPAttempts!: number;

  @prop()
  public lastOTPRequestTime?: Date;

  @prop({ default: 0 })
  public otpRequestCount!: number;

  @prop({ default: true })
  public isActive!: boolean;

  @prop({ default: false })
  public isDeleted!: boolean;

  // Password reset
  @prop({ select: false })
  public resetPasswordToken?: string;

  @prop()
  public resetPasswordExpiry?: Date;

  // Last login
  @prop()
  public lastLogin?: Date;

  // Refresh tokens (for logout management)
  @prop({ type: () => [String], default: [] })
  public refreshTokens!: string[];

  // Two factor authentication
  @prop({ default: false })
  public isTwoFactorEnabled!: boolean;

  @prop({ select: false })
  public twoFactorSecret?: string;
}

export const UserModel = getModelForClass(User);