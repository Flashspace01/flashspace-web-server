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
  public space!: Ref<CoworkingSpace | VirtualOffice | MeetingRoom>;

  @prop({
    required: true,
    enum: ["CoworkingSpace", "VirtualOffice", "MeetingRoom"],
  })
  public spaceModel!: string;

  @prop({ required: true, min: 1, max: 5 })
  public rating!: number;

  @prop({ required: true, trim: true, maxlength: 1000 })
  public comment!: string;

  @prop({ type: () => [String], default: [] })
  public reviewImages?: string[];

  @prop({ min: 0, max: 10 })
  public npsScore?: number;

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
    let updatedSpace: any = null;
    switch (spaceModelName) {
      case "CoworkingSpace":
        updatedSpace = await CoworkingSpaceModel.findByIdAndUpdate(
          spaceId,
          updateData,
          { new: true },
        );
        break;
      case "VirtualOffice":
        updatedSpace = await VirtualOfficeModel.findByIdAndUpdate(
          spaceId,
          updateData,
          { new: true },
        );
        break;
      case "MeetingRoom":
        updatedSpace = await MeetingRoomModel.findByIdAndUpdate(
          spaceId,
          updateData,
          { new: true },
        );
        break;
      default:
        console.warn(`Unknown spaceModelName: ${spaceModelName}`);
    }

    // 2. Update Property Master Rating
    if (updatedSpace && updatedSpace.property) {
      const propertyId = updatedSpace.property.toString();

      // Find all spaces belonging to this property across all types
      const [coworkingIds, virtualIds, meetingIds] = await Promise.all([
        CoworkingSpaceModel.distinct("_id", { property: propertyId }),
        VirtualOfficeModel.distinct("_id", { property: propertyId }),
        MeetingRoomModel.distinct("_id", { property: propertyId }),
      ]);

      const allSpaceIds = [...coworkingIds, ...virtualIds, ...meetingIds];

      // Calculate aggregate rating for the whole property
      const propertyStats = await ReviewModel.aggregate([
        { $match: { space: { $in: allSpaceIds } } },
        {
          $group: {
            _id: null,
            nRating: { $sum: 1 },
            avgRating: { $avg: "$rating" },
          },
        },
      ]);

      if (propertyStats.length > 0) {
        const { PropertyModel } = await import(
          "../propertyModule/property.model"
        );
        await PropertyModel.findByIdAndUpdate(propertyId, {
          totalReviews: propertyStats[0].nRating,
          avgRating: Math.round(propertyStats[0].avgRating * 10) / 10,
        });
      }
    }
  }
}

export const ReviewModel = getModelForClass(Review);
