import {
  getModelForClass,
  prop,
  modelOptions,
  Severity,
} from "@typegoose/typegoose";

@modelOptions({
  schemaOptions: { timestamps: true },
  options: { allowMixed: Severity.ALLOW },
})
export class Feedback {
  @prop({ required: true })
  public company!: string;

  @prop({ required: true })
  public rating!: number;

  @prop()
  public npsScore?: number;

  @prop({ required: true })
  public location!: string;

  @prop({ required: true })
  public review!: string;
}

export const FeedbackModel = getModelForClass(Feedback);
