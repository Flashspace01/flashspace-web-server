import { EventSpaceModel } from "./eventSpace.model";

export class EventSpaceService {
  static async createSpace(data: any, partnerId: string) {
    const space = new EventSpaceModel({
      ...data,
      partner: partnerId,
    });
    return await space.save();
  }

  static async updateSpace(spaceId: string, data: any, userId: string) {
    const space = await EventSpaceModel.findOneAndUpdate(
      { _id: spaceId, partner: userId },
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

  static async deleteSpace(spaceId: string, userId: string) {
    const space = await EventSpaceModel.findOneAndUpdate(
      { _id: spaceId, partner: userId },
      { isDeleted: true },
      { new: true },
    );

    if (!space) {
      throw new Error("Event space not found or unauthorized");
    }
    return space;
  }
}
