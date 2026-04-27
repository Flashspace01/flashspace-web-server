import {
  prop,
  modelOptions,
  getModelForClass,
  index,
  Severity,
} from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Types } from "mongoose";

export enum AuthProvider {
  LOCAL = "local",
  GOOGLE = "google",
}

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
  PARTNER = "partner",
  SALES = "sales",
  AFFILIATE = "affiliate",
  AFFILIATE_MANAGER = "affiliate_manager",
  SPACE_PARTNER_MANAGER = "space_partner_manager",
  SUPPORT = "support",
}

export class SecurityPreferences {
  @prop({ default: false })
  public twoFactorEnabled!: boolean;

  @prop({ default: true })
  public loginNotifications!: boolean;

  @prop({ default: false })
  public browserSessionPersistence!: boolean;

  @prop({ type: () => [String], default: [] })
  public recognizedDevices!: string[];
}

export class UserPreferences {
  @prop({ default: "en" })
  public language!: string;

  @prop({ default: "light" })
  public theme!: string;

  @prop({ default: "INR" })
  public currency!: string;
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
        delete ret.resetPasswordToken;
        return ret;
      },
    },
  },
  options: { allowMixed: Severity.ALLOW },
})
@index({ email: 1 }, { unique: true })
@index({ googleId: 1 }, { sparse: true, unique: true })
@index({ isDeleted: 1, isActive: 1 }) // Filter active users efficiently
@index({ role: 1 }) // Role-based access queries
@index({ parentPartnerId: 1, isTeamMember: 1, isDeleted: 1 }) // Team member queries
@index({ authProvider: 1 }) // Provider-specific queries
@index({ lastLogin: -1 }) // Recent activity tracking
@index(
  { emailVerificationOTPExpiry: 1 },
  { sparse: true },
) // Query expired OTPs without deleting user documents
@index({ resetPasswordExpiry: 1 }, { sparse: true }) // Query expired reset tokens without deleting user documents
export class User extends TimeStamps {
  public _id!: Types.ObjectId;

  @prop({ type: () => String, required: true, trim: true, lowercase: true })
  public email!: string;

  @prop({ type: () => String, required: true, trim: true })
  public fullName!: string;

  @prop({ trim: true })
  public phoneNumber?: string;

  // If present, this account belongs to a partner's internal team
  @prop({ ref: () => User, type: () => Types.ObjectId })
  public parentPartnerId?: Types.ObjectId;

  @prop({ default: false })
  public isTeamMember!: boolean;

  @prop({ trim: true, default: "team_member" })
  public teamMemberAccessRole!: string;

  // Encrypted login password (for partner-side credential visibility)
  @prop({ select: false })
  public teamMemberPasswordEncrypted?: string;

  @prop({ select: false })
  public teamMemberPasswordIv?: string;

  @prop({ select: false })
  public teamMemberPasswordTag?: string;

  @prop()
  public profilePicture?: string;

  // Password (only for local auth)
  @prop({ select: false }) // Don't select by default for security
  public password?: string;

  // Google OAuth
  @prop()
  public googleId?: string;

  // Auth provider
  @prop({ enum: AuthProvider, default: AuthProvider.LOCAL })
  public authProvider!: AuthProvider;

  // User role
  @prop({ enum: UserRole, default: UserRole.USER })
  public role!: UserRole;

  @prop({ trim: true, unique: true, sparse: true })
  public partnerId?: string; // e.g., FSP-2024-001

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

  @prop({ default: 0 })
  public credits!: number;

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

  // App Preferences
  @prop({
    type: () => Object,
    default: {
      language: "en",
      currency: "inr",
      defaultCity: "delhi",
      timeZone: "ist",
      darkMode: false,
      compactView: false,
    },
  })
  public preferences!: {
    language: string;
    currency: string;
    defaultCity: string;
    timeZone: string;
    darkMode: boolean;
    compactView: boolean;
  };

  // Notification Preferences
  @prop({
    type: () => Object,
    default: {
      email: true,
      push: true,
      promotional: false,
      reminders: true,
      loginAlerts: true,
    },
  })
  public notifications!: {
    email: boolean;
    push: boolean;
    promotional: boolean;
    reminders: boolean;
    loginAlerts: boolean;
  };

  // Security Preferences
  @prop({
    type: () => Object,
    default: { sessionManagement: true, dataSharing: false },
  })
  public securityPreferences!: {
    sessionManagement: boolean;
    dataSharing: boolean;
  };
}

export const UserModel = getModelForClass(User);
