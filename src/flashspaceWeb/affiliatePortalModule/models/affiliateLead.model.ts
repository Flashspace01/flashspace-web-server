import { prop, getModelForClass, modelOptions, Index } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Types } from "mongoose";
import { User } from "../../authModule/models/user.model";

export enum LeadStatus {
  HOT = "Hot",
  WARM = "Warm",
  COLD = "Cold",
  CONVERTED = "Converted",
}

export enum LeadInterest {
  HIGH = "Virtual Office",
  MEDIUM = "Team Space",
  LOW = "Meeting Room",
  VERY_LOW = "Day Pass",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "affiliate_leads",
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
})

@Index({ affiliateId: 1 })
export class AffiliateLead extends TimeStamps {
  public _id!: Types.ObjectId;

  @prop({ ref: () => User, required: true })
  public affiliateId!: Types.ObjectId;

  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true, trim: true })
  public phone!: string;

  @prop({ trim: true, lowercase: true })
  public email?: string;

  @prop({ trim: true })
  public company?: string;

  @prop({ trim: true, enum: LeadInterest })
  public interest?: LeadInterest;

  @prop({ enum: LeadStatus, default: LeadStatus.WARM })
  public status!: LeadStatus;

  @prop({ default: Date.now })
  public lastContact!: Date;

  @prop({ trim: true })
  public notes?: string;
}

export const AffiliateLeadModel = getModelForClass(AffiliateLead);
