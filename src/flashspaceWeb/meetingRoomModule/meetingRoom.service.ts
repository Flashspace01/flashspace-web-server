import { MeetingRoomModel } from "./meetingRoom.model";
import { UserRole } from "../authModule/models/user.model";
import { PropertyService } from "../propertyModule/property.service";
import { PropertyModel } from "../propertyModule/property.model";
import { SpaceApprovalStatus } from "../shared/enums/spaceApproval.enum";
import { checkAndAdvanceSpaceStatus } from "../shared/utils/spaceOnboarding.utils";
export class MeetingRoomService {
  static async createRoom(data: any, partnerId: string) {
    const property = await PropertyService.createProperty(data, partnerId);

    const meetingRoom = new MeetingRoomModel({
      ...data,
      property: property._id,
      partner: partnerId,
      approvalStatus: SpaceApprovalStatus.PENDING_KYC,
    });
    const savedRoom = await meetingRoom.save();

    // Check if we can automatically advance it
    await checkAndAdvanceSpaceStatus(partnerId, property._id.toString());

    return savedRoom;
  }

  // ADDED: userRole parameter
  static async updateRoom(
    roomId: string,
    data: any,
    userId: string,
    userRole?: string,
  ) {
    // Dynamic query building based on role
    const query: any = { _id: roomId };
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId; // Enforce ownership for non-admins
    }

    // Check if room exists and user is authorized
    const roomToUpdate = await MeetingRoomModel.findOne(query);
    if (!roomToUpdate) {
      throw new Error("Meeting room not found or unauthorized");
    }

    // Update Property Fields
    await PropertyService.updateProperty(
      roomToUpdate.property.toString(),
      data,
    );

    const room = await MeetingRoomModel.findOneAndUpdate(
      query,
      { $set: data },
      { new: true, runValidators: true },
    ).populate("property");

    return room;
  }

  static async getRooms(filter: any = {}, limit: number = 100) {
    if (filter.isDeleted === undefined) {
      filter.isDeleted = false;
    }

    // Handle queries on property fields (like city)
    if (filter.city || filter.name || filter.area) {
      const propertyQuery: any = {};
      if (filter.city) propertyQuery.city = filter.city;
      if (filter.name) propertyQuery.name = filter.name;
      if (filter.area) propertyQuery.area = filter.area;

      const matchedProperties =
        await PropertyModel.find(propertyQuery).select("_id");
      const propertyIds = matchedProperties.map((p) => p._id);

      delete filter.city;
      delete filter.name;
      delete filter.area;

      filter.property = { $in: propertyIds };
    }

    return await MeetingRoomModel.find(filter)
      .populate("property")
      .sort({ createdAt: -1 })
      .limit(limit);
  }
  static async getRoomById(roomId: string) {
    return await MeetingRoomModel.findById(roomId)
      .populate("property")
      .populate("partner", "firstName lastName email");
  }

  // ADDED: userRole parameter
  static async deleteRoom(roomId: string, userId: string, userRole?: string) {
    // Dynamic query building based on role
    const query: any = { _id: roomId };
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId; // Enforce ownership for non-admins
    }

    // Soft delete
    const room = await MeetingRoomModel.findOneAndUpdate(
      query,
      { isDeleted: true },
      { new: true },
    );

    if (!room) {
      throw new Error("Meeting room not found or unauthorized");
    }
    return room;
  }
}
