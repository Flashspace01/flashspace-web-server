import { prop, getModelForClass, Ref, index } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { User } from "../../authModule/models/user.model";

export enum PayoutStatus {
  PENDING = "Pending",
  PROCESSING = "Processing",
  COMPLETED = "Completed",
  FAILED = "Failed"
}

@index({ affiliateId: 1 })
@index({ status: 1 })
export class AffiliatePayout extends TimeStamps {
  @prop({ ref: () => User, required: true })
  public affiliateId!: Ref<User>;

  @prop({ required: true })
  public amount!: number;

  @prop({ required: true })
  public periodStart!: Date;

  @prop({ required: true })
  public periodEnd!: Date;

  @prop({ enum: PayoutStatus, default: PayoutStatus.PENDING })
  public status!: PayoutStatus;

  @prop()
  public transactionReference?: string;

  @prop()
  public notes?: string;

  @prop()
  public processedDate?: Date;
}

export const AffiliatePayoutModel = getModelForClass(AffiliatePayout);
