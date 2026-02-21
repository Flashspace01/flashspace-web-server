import { CoworkingSpaceModel } from "./coworkingSpace.model";
import { FilterQuery, Types } from "mongoose";
import { UserRole } from "../authModule/models/user.model";

export class CoworkingSpaceService {
  static async createSpace(data: any, partnerId: string) {
    return await CoworkingSpaceModel.create({
      ...data,
      partner: partnerId,
      avgRating: 0,
      totalReviews: 0,
    });
  }

  // FIXED: Added userRole and dynamic RBAC query
  static async updateSpace(spaceId: string, data: any, userId: string, userRole?: string) {
    const query: any = { _id: spaceId, isDeleted: false };
    
    // Enforce ownership if the user is NOT an admin
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId; 
    }

    // Exclude rating fields from update to prevent manipulation
    const { avgRating, totalReviews, ...updateData } = data;

    const space = await CoworkingSpaceModel.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!space) {
      throw new Error("Space not found or unauthorized");
    }

    return space;
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

  // FIXED: Added userRole and dynamic RBAC query
  static async deleteSpace(spaceId: string, userId: string, userRole?: string) {
    const query: any = { _id: spaceId, isDeleted: false };

    // Enforce ownership if the user is NOT an admin
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId; 
    }

    // Soft delete
    const space = await CoworkingSpaceModel.findOneAndUpdate(
      query,
      { isActive: false, isDeleted: true },
      { new: true }
    );

    if (!space) {
      throw new Error("Space not found or unauthorized");
    }

    return space;
  }
}