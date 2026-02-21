import { MeetingRoomModel } from "./meetingRoom.model";
import { UserRole } from "../authModule/models/user.model"; // Ensure this path is correct

export class MeetingRoomService {
  static async createRoom(data: any, partnerId: string) {
    const meetingRoom = new MeetingRoomModel({
      ...data,
      partner: partnerId,
    });
    return await meetingRoom.save();
  }

  // ADDED: userRole parameter
  static async updateRoom(roomId: string, data: any, userId: string, userRole?: string) {
    // Dynamic query building based on role
    const query: any = { _id: roomId };
    if (userRole !== UserRole.ADMIN) {
      query.partner = userId; // Enforce ownership for non-admins
    }

    const room = await MeetingRoomModel.findOneAndUpdate(
      query,
      { $set: data },
      { new: true, runValidators: true },
    );

    if (!room) {
      throw new Error("Meeting room not found or unauthorized");
    }
    return room;
  }

  static async getRooms(filter: any = {}) {
    if (filter.isDeleted === undefined) {
      filter.isDeleted = false;
    }
    return await MeetingRoomModel.find(filter).sort({ createdAt: -1 });
  }

  static async getRoomById(roomId: string) {
    return await MeetingRoomModel.findById(roomId).populate(
      "partner",
      "firstName lastName email",
    );
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