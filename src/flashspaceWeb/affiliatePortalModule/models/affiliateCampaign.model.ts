import { prop, getModelForClass, Ref, index } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { User } from "../../authModule/models/user.model";

@index({ affiliateId: 1 })
export class AffiliateCampaign extends TimeStamps {
  @prop({ ref: () => User, required: true })
  public affiliateId!: Ref<User>;

  @prop({ required: true, trim: true })
  public name!: string; // e.g., "Main Referral Link", "Summer Promo"

  @prop({ required: true, unique: true, trim: true })
  public slug!: string; // e.g., "AFF123-summer" -> full link constructed from this

  @prop({ default: 0 })
  public clicks!: number;

  @prop({ default: 0 })
  public conversions!: number;

  // Conversion rate can be calculated virtually
  public get conversionRate(): string {
    if (this.clicks === 0) return "0%";
    return `${Math.round((this.conversions / this.clicks) * 100)}%`;
  }
}

export const AffiliateCampaignModel = getModelForClass(AffiliateCampaign);
