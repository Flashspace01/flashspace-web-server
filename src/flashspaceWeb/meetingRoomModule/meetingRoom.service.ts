import { MeetingRoomModel } from "./meetingRoom.model";

export class MeetingRoomService {
  static async createRoom(data: any, partnerId: string) {
    const meetingRoom = new MeetingRoomModel({
      ...data,
      partner: partnerId,
    });
    return await meetingRoom.save();
  }

  static async updateRoom(roomId: string, data: any, userId: string) {
    // Check ownership or permission logic here if needed beyond middleware
    const room = await MeetingRoomModel.findOneAndUpdate(
      { _id: roomId, partner: userId },
      { $set: data },
      { new: true, runValidators: true },
    );

    if (!room) {
      throw new Error("Meeting room not found or unauthorized");
    }
    return room;
  }

  static async getRooms(filter: any = {}) {
    // Default to not showing deleted rooms unless specified
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

  static async deleteRoom(roomId: string, userId: string) {
    // Soft delete
    const room = await MeetingRoomModel.findOneAndUpdate(
      { _id: roomId, partner: userId },
      { isDeleted: true },
      { new: true },
    );

    if (!room) {
      throw new Error("Meeting room not found or unauthorized");
    }
    return room;
  }
}
