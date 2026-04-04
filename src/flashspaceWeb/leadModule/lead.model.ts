import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ email: 1 })
@index({ createdAt: -1 })
@index({ phone: 1 })
export class Lead {
  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true, trim: true })
  public email!: string;

  @prop({ required: true, trim: true })
  public phone!: string;

  @prop({ trim: true })
  public city?: string;

  @prop({ trim: true })
  public businessType?: string;

  @prop({ trim: true })
  public budget?: string;

  @prop({ trim: true })
  public message?: string;

  @prop({ trim: true })
  public source?: string;

  @prop({ trim: true })
  public page?: string;

  @prop({ type: () => Object })
  public utm?: any;

  @prop({ default: "pending" })
  public status?: string;
}

export const LeadModel = getModelForClass(Lead);
