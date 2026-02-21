import { EventSpaceModel } from "./eventSpace.model";
import { UserRole } from "../authModule/models/user.model"; // Ensure this import matches your project structure

export class EventSpaceService {
  static async createSpace(data: any, partnerId: string) {
    const space = new EventSpaceModel({
      ...data,
      partner: partnerId,
    });
    return await space.save();
  }

  // FIXED: Added userRole and conditional RBAC query
  static async updateSpace(spaceId: string, data: any, userId: string, userRole?: string) {
    const query: any = { _id: spaceId };
    
    // If not an admin, ensure the user actually owns this space
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId;
    }

    const space = await EventSpaceModel.findOneAndUpdate(
      query,
      { $set: data },
      { new: true, runValidators: true },
    );

    if (!space) {
      throw new Error("Event space not found or unauthorized");
    }
    return space;
  }

  static async getSpaces(filter: any = {}) {
    // Default to not showing deleted spaces unless specified
    if (filter.isDeleted === undefined) {
      filter.isDeleted = false;
    }
    return await EventSpaceModel.find(filter).sort({ createdAt: -1 });
  }

  static async getSpaceById(spaceId: string) {
    return await EventSpaceModel.findById(spaceId).populate(
      "partner",
      "firstName lastName email",
    );
  }

  // FIXED: Added userRole and conditional RBAC query
  static async deleteSpace(spaceId: string, userId: string, userRole?: string) {
    const query: any = { _id: spaceId };
    
    // If not an admin, ensure the user actually owns this space
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId;
    }

    const space = await EventSpaceModel.findOneAndUpdate(
      query,
      { isDeleted: true },
      { new: true },
    );

    if (!space) {
      throw new Error("Event space not found or unauthorized");
    }
    return space;
  }
}