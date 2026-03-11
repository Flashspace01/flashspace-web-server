import {
  prop,
  getModelForClass,
  modelOptions,
  Ref,
  Severity,
} from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";
import mongoose from "mongoose";

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "partner_staff",
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
  options: { allowMixed: Severity.ALLOW },
})
export class PartnerStaff {
  @prop({ ref: () => User, required: true })
  public partnerId!: mongoose.Types.ObjectId;

  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true, trim: true, lowercase: true })
  public email!: string;

  @prop({ enum: ["ADMIN", "MANAGER", "STAFF"], default: "STAFF" })
  public role!: string;

  @prop({ default: Date.now })
  public joinedDate!: Date;
}

export const PartnerStaffModel = getModelForClass(PartnerStaff);
