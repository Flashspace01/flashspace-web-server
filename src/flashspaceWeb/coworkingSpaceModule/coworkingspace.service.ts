import { CoworkingSpaceModel } from "./coworkingspace.model";
import { FilterQuery, Types } from "mongoose";

export class CoworkingSpaceService {
  static async createSpace(data: any, partnerId: string) {
    return await CoworkingSpaceModel.create({
      ...data,
      partner: partnerId,
      avgRating: 0,
      totalReviews: 0,
    });
  }

  static async updateSpace(spaceId: string, data: any, userId: string) {
    const space = await CoworkingSpaceModel.findOne({
      _id: spaceId,
      isDeleted: false,
    });

    if (!space) {
      throw new Error("Space not found");
    }

    if (space.partner?.toString() !== userId) {
      // In a real app, you might check for "manager" role here too
      throw new Error(
        "Unauthorized: You do not have permission to edit this space",
      );
    }

    // Exclude rating fields from update to prevent manipulation
    const { avgRating, totalReviews, ...updateData } = data;

    return await CoworkingSpaceModel.findByIdAndUpdate(
      spaceId,
      { $set: updateData },
      { new: true, runValidators: true },
    );
  }

  static async getSpaces(query: FilterQuery<any>) {
    return await CoworkingSpaceModel.find({
      ...query,
      isDeleted: false,
    }).sort({ createdAt: -1 });
  }

  static async getSpaceById(spaceId: string) {
    if (!Types.ObjectId.isValid(spaceId)) {
      throw new Error("Invalid ID format");
    }
    return await CoworkingSpaceModel.findOne({
      _id: spaceId,
      isDeleted: false,
    });
  }

  static async deleteSpace(spaceId: string, userId: string) {
    const space = await CoworkingSpaceModel.findOne({
      _id: spaceId,
      isDeleted: false,
    });

    if (!space) {
      throw new Error("Space not found");
    }

    if (space.partner.toString() !== userId) {
      throw new Error(
        "Unauthorized: You do not have permission to delete this space",
      );
    }

    // Soft delete
    return await CoworkingSpaceModel.findByIdAndUpdate(
      spaceId,
      { isActive: false, isDeleted: true },
      { new: true },
    );
  }
}
