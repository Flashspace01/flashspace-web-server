import { Types } from "mongoose";
import { ApiResponse } from "../../authModule/types/auth.types";
import { MeetingRoomModel } from "../../meetingRoomModule/meetingRoom.model";
import { CoworkingSpaceModel } from "../../coworkingSpaceModule/coworkingspace.model";
import { EventSpaceModel } from "../../eventSpaceModule/eventSpace.model";
import { VirtualOfficeModel } from "../../virtualOfficeModule/virtualOffice.model";

export type ListSpacesParams = {
  search?: string;
  city?: string;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
};

export class SpacePortalSpacesService {
  /**
   * Aggregates spaces from all specific modules.
   * Currently returns all spaces for the partner without pagination across modules (simplification).
   */
  async getSpaces(
    params: ListSpacesParams,
    partnerId?: string,
  ): Promise<ApiResponse> {
    try {
      if (!partnerId) {
        return {
          success: false,
          message:
            "Partner ID is required to list spaces in the Partner Dashboard.",
        };
      }

      const { search, city, includeDeleted } = params;

      const query: any = {
        partner: partnerId,
      };

      if (!includeDeleted) {
        query.isDeleted = { $ne: true };
      }

      if (city) {
        query.city = new RegExp(city, "i");
      }

      // Note: Search implementation across 4 collections is complex.
      // For now, we fetch all for the partner and let the frontend filter if needed,
      // or we apply basic name search if provided.
      if (search) {
        query.name = new RegExp(search, "i");
      }

      const [meetingRooms, coworkingSpaces, eventSpaces, virtualOffices] =
        await Promise.all([
          MeetingRoomModel.find(query).sort({ createdAt: -1 }).lean(),
          CoworkingSpaceModel.find(query).sort({ createdAt: -1 }).lean(),
          EventSpaceModel.find(query).sort({ createdAt: -1 }).lean(),
          VirtualOfficeModel.find(query).sort({ createdAt: -1 }).lean(),
        ]);

      return {
        success: true,
        message: "Spaces fetched successfully",
        data: {
          meetingRooms,
          coworkingSpaces,
          eventSpaces,
          virtualOffices,
          // Summary counts
          counts: {
            meetingRooms: meetingRooms.length,
            coworkingSpaces: coworkingSpaces.length,
            eventSpaces: eventSpaces.length,
            virtualOffices: virtualOffices.length,
            total:
              meetingRooms.length +
              coworkingSpaces.length +
              eventSpaces.length +
              virtualOffices.length,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch spaces",
        error: error?.message,
      };
    }
  }

  /**
   * Fetch a single space by ID by checking all collections.
   * Efficient if we know the type, but here we just try to find it.
   */
  async getSpaceById(
    spaceId: string,
    partnerId?: string,
  ): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(spaceId)) {
        return {
          success: false,
          message: "Invalid space ID format",
        };
      }

      const query = {
        _id: spaceId,
        ...(partnerId ? { partner: partnerId } : {}),
      };

      // Try parallel lookup since ID is unique across collections usually (or we assume disjoint sets)
      const [mr, cs, es, vo] = await Promise.all([
        MeetingRoomModel.findOne(query).lean(),
        CoworkingSpaceModel.findOne(query).lean(),
        EventSpaceModel.findOne(query).lean(),
        VirtualOfficeModel.findOne(query).lean(),
      ]);

      const space = mr || cs || es || vo;
      if (!space) {
        return {
          success: false,
          message: "Space not found",
        };
      }

      let type = "unknown";
      if (mr) type = "meeting_room";
      if (cs) type = "coworking_space";
      if (es) type = "event_space";
      if (vo) type = "virtual_office";

      return {
        success: true,
        message: "Space fetched successfully",
        data: { ...space, type },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch space",
        error: error?.message,
      };
    }
  }
}
