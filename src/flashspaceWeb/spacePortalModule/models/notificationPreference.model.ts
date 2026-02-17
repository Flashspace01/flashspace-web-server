import { prop, getModelForClass, modelOptions, index, Ref } from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ user: 1 }, { unique: true })
export class SpacePortalNotificationPreference {
  @prop({ ref: () => User, required: true })
  public user!: Ref<User>;

  @prop({ default: true })
  public emailUpdates!: boolean;

  @prop({ default: true })
  public bookingAlerts!: boolean;

  @prop({ default: false })
  public smsAlerts!: boolean;
}

export const SpacePortalNotificationPreferenceModel =
  getModelForClass(SpacePortalNotificationPreference);
