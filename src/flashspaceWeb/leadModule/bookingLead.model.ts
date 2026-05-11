import { prop, getModelForClass, modelOptions, index, Ref, Severity } from "@typegoose/typegoose";
import { User } from "../authModule/models/user.model";

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
@index({ email: 1 })
@index({ createdAt: -1 })
@index({ phone: 1 })
@index({ spaceId: 1 })
export class BookingLead {
  @prop({ ref: () => User })
  public userId?: Ref<User>;

  @prop({ trim: true })
  public name?: string;

  @prop({ required: true, trim: true })
  public email!: string;

  @prop({ required: true, trim: true })
  public phone!: string;

  @prop({ required: true, trim: true })
  public spaceId!: string;

  @prop({ trim: true })
  public spaceName?: string;

  @prop({ default: "pending" })
  public status?: string;

  @prop({ type: () => Object })
  public utm?: any;
}

export const BookingLeadModel = getModelForClass(BookingLead);
