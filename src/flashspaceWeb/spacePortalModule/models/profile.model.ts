import { prop, getModelForClass, modelOptions, index, Ref } from "@typegoose/typegoose";
import { User } from "../../authModule/models/user.model";

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
@index({ user: 1 }, { unique: true })
export class SpacePortalProfile {
  @prop({ ref: () => User, required: true })
  public user!: Ref<User>;

  @prop({ trim: true })
  public company?: string;

  @prop({ trim: true })
  public location?: string;
}

export const SpacePortalProfileModel = getModelForClass(SpacePortalProfile);
