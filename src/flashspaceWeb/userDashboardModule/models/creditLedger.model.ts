import {
  prop,
  getModelForClass,
  modelOptions,
  Ref,
} from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";

export enum CreditType {
  EARNED = "earned",
  SPENT = "spent",
  EXPIRED = "expired",
  REFUND = "refund",
  REVOKED = "revoked",
}

import { Booking } from "./booking.model";

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "credit_ledger",
  },
})
export class CreditLedger {
  @prop({ ref: () => User, required: true })
  public user!: Ref<User>;

  @prop({ required: true })
  public amount!: number; // Positive for earn/refund, negative for spend/revoke/expire

  @prop({ required: true, enum: CreditType })
  public type!: CreditType;

  @prop()
  public description?: string;

  @prop({ ref: () => Booking })
  public bookingId?: Ref<Booking>; // Reference to the booking

  @prop()
  public serviceName?: string; // Snapshot string (e.g., "Meeting Room A")

  @prop()
  public referenceId?: string; // Payment ID or other ref

  @prop({ required: true })
  public balanceAfter!: number;

  // Fields for Earned/Refunded credits (FIFO tracking)
  @prop()
  public expiryDate?: Date;

  @prop({ default: 0 })
  public remainingAmount?: number; // How much of this batch is left

  @prop({ default: false })
  public isExpired?: boolean;
}

export const CreditLedgerModel = getModelForClass(CreditLedger);
