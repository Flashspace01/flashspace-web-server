import {
  prop,
  getModelForClass,
  modelOptions,
  Ref,
  index,
} from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";
import mongoose from "mongoose";

export enum CreditType {
  EARNED = "earned",
  SPENT = "spent",
  EXPIRED = "expired",
  REFUND = "refund",
  REVOKED = "revoked",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "credit_ledger",
  },
})
// FIXED: Index for fast user history lookups
@index({ user: 1, createdAt: -1 })
// FIXED: Compound index specifically designed to make the Midnight Cron Job lightning fast
@index({ isExpired: 1, remainingAmount: 1, expiryDate: 1 }) 
export class CreditLedger {
  @prop({ ref: () => User, required: true })
  public user!: Ref<User>;

  @prop({ required: true })
  public amount!: number; 

  @prop({ required: true, enum: CreditType })
  public type!: CreditType;

  @prop()
  public description?: string;

  // FIXED: Converted to ObjectId for relational integrity
  @prop({ type: () => mongoose.Types.ObjectId })
  public bookingId?: mongoose.Types.ObjectId; 

  @prop()
  public serviceName?: string; 

  @prop()
  public referenceId?: string; 

  @prop({ required: true })
  public balanceAfter!: number;

  @prop()
  public expiryDate?: Date;

  @prop({ default: 0 })
  public remainingAmount?: number; 

  @prop({ default: false })
  public isExpired?: boolean;
}

export const CreditLedgerModel = getModelForClass(CreditLedger);