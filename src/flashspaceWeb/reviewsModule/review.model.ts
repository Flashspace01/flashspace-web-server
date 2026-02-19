import {
  prop,
  getModelForClass,
  modelOptions,
  index,
  Ref,
  post,
  DocumentType,
} from "@typegoose/typegoose";
import { Types } from "mongoose";
import { User } from "../authModule/models/user.model";
import {
  CoworkingSpace,
  CoworkingSpaceModel,
} from "../coworkingSpaceModule/coworkingspace.model";
import {
  VirtualOffice,
  VirtualOfficeModel,
} from "../virtualOfficeModule/virtualOffice.model";
import {
  MeetingRoom,
  MeetingRoomModel,
} from "../meetingRoomModule/meetingRoom.model";
import {
  EventSpace,
  EventSpaceModel,
} from "../eventSpaceModule/eventSpace.model";

@modelOptions({ schemaOptions: { timestamps: true } })
@index({ space: 1, createdAt: -1 }) // Fast lookup for a specific office's reviews
@index({ user: 1, space: 1 }, { unique: true }) // Production safety: One review per user/space
@post<Review>("save", async function (doc: DocumentType<Review>) {
  console.log(
    "Review saved (hook), calculating average ratings for space:",
    doc.space,
  );
  try {
    await (doc.constructor as any).calcAverageRatings(doc.space.toString());
    console.log("Average ratings calculated successfully");
  } catch (err) {
    console.error("Error calculating average ratings:", err);
  }
})
export class Review {
  @prop({ ref: () => User, required: true })
  public user!: Ref<User>;

  @prop({
    refPath: "spaceModel",
    required: true,
  })
  public space!: Ref<CoworkingSpace | VirtualOffice | MeetingRoom | EventSpace>;

  @prop({
    required: true,
    enum: ["CoworkingSpace", "VirtualOffice", "MeetingRoom", "EventSpace"],
  })
  public spaceModel!: string;

  @prop({ required: true, min: 1, max: 5 })
  public rating!: number;

  @prop({ required: true, trim: true, maxlength: 1000 })
  public comment!: string;

  @prop({ type: () => [String], default: [] })
  public reviewImages?: string[];

  public static async calcAverageRatings(spaceId: string) {
    const stats = await ReviewModel.aggregate([
      {
        $match: { space: new Types.ObjectId(spaceId) },
      },
      {
        $group: {
          _id: "$space",
          nRating: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    const updateData =
      stats.length > 0
        ? {
            totalReviews: stats[0].nRating,
            avgRating: Math.round(stats[0].avgRating * 10) / 10,
          }
        : {
            totalReviews: 0,
            avgRating: 0,
          };

    // Try updating CoworkingSpace
    let updated = await CoworkingSpaceModel.findByIdAndUpdate(
      spaceId,
      updateData,
    );

    // If not found, try VirtualOffice
    if (!updated) {
      updated = await VirtualOfficeModel.findByIdAndUpdate(spaceId, updateData);
    }

    // If still not found, try MeetingRoom
    if (!updated) {
      updated = await MeetingRoomModel.findByIdAndUpdate(spaceId, updateData);
    }

    // If still not found, try EventSpace
    if (!updated) {
      await EventSpaceModel.findByIdAndUpdate(spaceId, updateData);
    }
  }
}

export const ReviewModel = getModelForClass(Review);
