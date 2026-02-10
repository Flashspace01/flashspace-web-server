import { prop, getModelForClass } from "@typegoose/typegoose";



export class Feedback {

  @prop({ required: true })

  company!: string;



  @prop({ required: true, min: 1, max: 5 })

  rating!: number;



  // ⭐ NPS score (0–10) → optional

  @prop({ min: 0, max: 10 })

  npsScore?: number;



  @prop({ required: true })

  location!: string;



  @prop({ required: true })

  review!: string;



  @prop({ default: Date.now })

  createdAt!: Date;

}



export const FeedbackModel = getModelForClass(Feedback, {

  schemaOptions: {

    timestamps: true,

  },

});

