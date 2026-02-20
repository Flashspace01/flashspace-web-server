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
} from "../coworkingSpaceModule/coworkingSpace.model";
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
@index({ space: 1, createdAt: -1 })
@index({ user: 1, space: 1 }, { unique: true })
// Hook for new reviews
@post<Review>("save", async function (doc: DocumentType<Review>) {
  try {
    await (doc.constructor as any).calcAverageRatings(
      doc.space.toString(),
      doc.spaceModel,
    );
  } catch (err) {
    console.error("Error calculating average ratings:", err);
  }
})
// Fixed: Hook for deleted reviews
@post<Review>(
  /(findOneAndDelete|findOneAndRemove|deleteOne)/,
  async function (doc: DocumentType<Review> | null) {
    if (doc) {
      await (doc.constructor as any).calcAverageRatings(
        doc.space.toString(),
        doc.spaceModel,
      );
    }
  },
)
// Fixed: Hook for updated reviews (ensure { new: true } is passed in your query controllers!)
@post<Review>(
  /(findOneAndUpdate|updateOne)/,
  async function (doc: DocumentType<Review> | null) {
    if (doc) {
      await (doc.constructor as any).calcAverageRatings(
        doc.space.toString(),
        doc.spaceModel,
      );
    }
  },
)
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

  // Fixed: Accepts spaceModelName to avoid querying all collections
  public static async calcAverageRatings(
    spaceId: string,
    spaceModelName: string,
  ) {
    const stats = await ReviewModel.aggregate([
      { $match: { space: new Types.ObjectId(spaceId) } },
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

    // Fixed: Route update directly to the specific model
    switch (spaceModelName) {
      case "CoworkingSpace":
        await CoworkingSpaceModel.findByIdAndUpdate(spaceId, updateData);
        break;
      case "VirtualOffice":
        await VirtualOfficeModel.findByIdAndUpdate(spaceId, updateData);
        break;
      case "MeetingRoom":
        await MeetingRoomModel.findByIdAndUpdate(spaceId, updateData);
        break;
      case "EventSpace":
        await EventSpaceModel.findByIdAndUpdate(spaceId, updateData);
        break;
      default:
        console.warn(`Unknown spaceModelName: ${spaceModelName}`);
    }
  }
}

export const ReviewModel = getModelForClass(Review);
