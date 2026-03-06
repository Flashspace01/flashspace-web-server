import { MeetingRoomModel } from "./meetingRoom.model";
import { UserRole } from "../authModule/models/user.model";
import { PropertyService } from "../propertyModule/property.service";
import { PropertyModel } from "../propertyModule/property.model";
import { Types } from "mongoose";
import { SpaceApprovalStatus } from "../shared/enums/spaceApproval.enum";
import { checkAndAdvanceSpaceStatus } from "../shared/utils/spaceOnboarding.utils";
export class MeetingRoomService {
  private static calculateFinalPrices(data: any) {
    if (data.partnerPricePerHour !== undefined) {
      data.finalPricePerHour =
        (data.partnerPricePerHour || 0) + (data.adminMarkupPerHour || 0);
    }
    if (data.partnerPricePerDay !== undefined) {
      data.finalPricePerDay =
        (data.partnerPricePerDay || 0) + (data.adminMarkupPerDay || 0);
    }
    return data;
  }

  static async createRoom(data: any, partnerId: string) {
    let property;
    if (data.propertyId) {
      property = await PropertyModel.findById(data.propertyId);
      if (!property) throw new Error("Property not found");
    } else {
      property = await PropertyService.createProperty(data, partnerId);
    }

    const processedData = this.calculateFinalPrices(data);

    const meetingRoom = new MeetingRoomModel({
      ...processedData,
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

    const processedData = this.calculateFinalPrices(data);

    const room = await MeetingRoomModel.findOneAndUpdate(
      query,
      { $set: processedData },
      { new: true, runValidators: true },
    ).populate("property");

    return room;
  }

  static async getRooms(filter: any = {}, limit: number) {
    if (filter.isDeleted === "all") {
      delete filter.isDeleted;
    } else if (filter.isDeleted === undefined) {
      filter.isDeleted = false;
    }

    // Strict property filtering if provided
    if (filter.property) {
      filter.property =
        typeof filter.property === "string"
          ? new Types.ObjectId(filter.property)
          : filter.property;

      // Remove other property-derived filters to ensure they don't conflict
      delete filter.city;
      delete filter.name;
      delete filter.area;
    } else if (filter.city || filter.name || filter.area) {
      const propertyQuery: any = {};
      if (filter.city) propertyQuery.city = filter.city;
      if (filter.name) propertyQuery.name = filter.name;
      if (filter.area) propertyQuery.area = filter.area;

      const matchedProperties =
        await PropertyModel.find(propertyQuery).select("_id");
      filter.property = { $in: matchedProperties.map((p) => p._id) };

      delete filter.city;
      delete filter.name;
      delete filter.area;
    }
    console.log("filter", filter);
    if (limit) {
      return await MeetingRoomModel.find(filter)
        .populate("property")
        .sort({ createdAt: -1 })
        .limit(limit);
    }
    return await MeetingRoomModel.find(filter)
      .populate("property")
      .sort({ createdAt: -1 });
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

  /**
   * Bulk Save (Create/Update) meeting rooms for a property
   * Replaces existing rooms for the property with the new set.
   */
  static async bulkSaveRooms(
    propertyId: string,
    roomsData: any[],
    partnerId: string,
  ) {
    // Basic authorization check: verify partner owns the property
    const property = await PropertyModel.findOne({
      _id: propertyId,
      partner: partnerId,
    });
    if (!property) {
      throw new Error("Property not found or unauthorized");
    }

    // Process valid rooms (must have type, capacity, price)
    const validRooms = roomsData.filter(
      (room) => room.type && room.capacity && room.pricePerHour,
    );

    // Default operating hours if missing
    const defaultOperatingHours = {
      openTime: "09:00",
      closeTime: "18:00",
      daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    };

    const finalRooms = [];
    const finalRoomIds = []; // Added to track valid rooms for cleanup

    for (const roomData of validRooms) {
      const roomPayload: any = {
        ...roomData,
        property: propertyId,
        partner: partnerId,
        partnerPricePerHour:
          roomData.pricePerHour || roomData.partnerPricePerHour,
        partnerPricePerDay: roomData.pricePerDay || roomData.partnerPricePerDay,
        operatingHours: roomData.operatingHours || defaultOperatingHours,
      };

      const processedPayload = this.calculateFinalPrices(roomPayload);

      if (roomData._id) {
        // Update existing (preserve existing isActive status)
        const updated = await MeetingRoomModel.findOneAndUpdate(
          { _id: roomData._id, partner: partnerId, property: propertyId },
          { $set: processedPayload },
          { new: true, runValidators: true },
        );
        if (updated) {
          finalRooms.push(updated);
          finalRoomIds.push(updated._id);
        }
      } else {
        // Create new (inactive until KYC approval)
        processedPayload.isActive = false;
        const newRoom = new MeetingRoomModel(processedPayload);
        const saved = await newRoom.save();
        await PropertyModel.findByIdAndUpdate(propertyId, {
          $push: { meetingRooms: saved._id },
        });
        finalRooms.push(saved);
        finalRoomIds.push(saved._id);
      }
    }

    // Soft-delete any meeting rooms belonging to this property that were NOT in the current payload
    await MeetingRoomModel.updateMany(
      { property: propertyId, _id: { $nin: finalRoomIds } },
      { $set: { isDeleted: true } },
    );

    return finalRooms;
  }
}
