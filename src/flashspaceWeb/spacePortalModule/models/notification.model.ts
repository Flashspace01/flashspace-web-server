import { prop, getModelForClass, modelOptions, index, Ref } from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ user: 1 })
@index({ read: 1 })
@index({ isNew: 1 })
@index({ createdAt: -1 })
@index({ isDeleted: 1 })
export class SpacePortalNotification {
  @prop({ ref: () => User, required: true })
  public user!: Ref<User>;

  @prop({ required: true, trim: true })
  public title!: string;

  @prop({ trim: true })
  public description?: string;

  @prop({ trim: true })
  public time?: string;

  @prop({ default: false })
  public read?: boolean;

  @prop({ trim: true })
  public href?: string;

  @prop({ default: false })
  public isNew?: boolean;

  @prop({ default: false })
  public isDeleted?: boolean;
}

export const SpacePortalNotificationModel = getModelForClass(SpacePortalNotification);
