import { Types } from "mongoose";
import { ApiResponse } from "../../authModule/types/auth.types";
import {
  SpacePortalSpaceModel,
  SpacePortalSpaceStatus,
} from "../models/space.model";

export type CreateSpaceInput = {
  name: string;
  city: string;
  location: string;
  totalSeats: number;
  availableSeats: number;
  meetingRooms: number;
  cabins: number;
  status: SpacePortalSpaceStatus;
};

export type ListSpacesParams = {
  search?: string;
  status?: SpacePortalSpaceStatus;
  city?: string;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class SpacePortalSpacesService {
  async createSpace(payload: CreateSpaceInput): Promise<ApiResponse> {
    try {
      if (payload.availableSeats > payload.totalSeats) {
        return {
          success: false,
          message: "Available seats cannot exceed total seats",
        };
      }

      const createdSpace = await SpacePortalSpaceModel.create(payload);

      return {
        success: true,
        message: "Space created successfully",
        data: createdSpace,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to create space",
        error: error?.message,
      };
    }
  }

  async getSpaces(params: ListSpacesParams): Promise<ApiResponse> {
    try {
      const {
        search,
        status,
        city,
        page = 1,
        limit = 10,
        includeDeleted = false,
      } = params;

      const query: any = {
        isDeleted: includeDeleted ? { $in: [true, false] } : false,
      };

      if (status) query.status = status;
      if (city) query.city = new RegExp(`^${escapeRegex(city)}$`, "i");

      if (search) {
        const term = new RegExp(escapeRegex(search), "i");
        const objectIdMatch = Types.ObjectId.isValid(search)
          ? { _id: search }
          : undefined;
        query.$or = [
          { name: term },
          { city: term },
          { location: term },
          ...(objectIdMatch ? [objectIdMatch] : []),
        ];
      }

      const skip = (page - 1) * limit;

      const [spaces, total] = await Promise.all([
        SpacePortalSpaceModel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        SpacePortalSpaceModel.countDocuments(query),
      ]);

      const mappedSpaces = spaces.map((space: any) => ({
        ...(space.toObject ? space.toObject() : space),
        id: space._id?.toString?.() || space.id,
      }));

      return {
        success: true,
        message: "Spaces fetched successfully",
        data: {
          spaces: mappedSpaces,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
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

  async getSpaceById(spaceId: string): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(spaceId)) {
        return {
          success: false,
          message: "Invalid space ID format",
        };
      }

      const space = await SpacePortalSpaceModel.findOne({
        _id: spaceId,
        isDeleted: false,
      });

      if (!space) {
        return {
          success: false,
          message: "Space not found",
        };
      }

      const mappedSpace = {
        ...(space.toObject ? space.toObject() : space),
        id: space._id?.toString?.() || (space as any).id,
      };

      return {
        success: true,
        message: "Space fetched successfully",
        data: mappedSpace,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch space",
        error: error?.message,
      };
    }
  }

  async updateSpace(
    spaceId: string,
    payload: Partial<CreateSpaceInput>
  ): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(spaceId)) {
        return {
          success: false,
          message: "Invalid space ID format",
        };
      }

      if (
        payload.totalSeats !== undefined &&
        payload.availableSeats !== undefined &&
        payload.availableSeats > payload.totalSeats
      ) {
        return {
          success: false,
          message: "Available seats cannot exceed total seats",
        };
      }

      const updated = await SpacePortalSpaceModel.findOneAndUpdate(
        { _id: spaceId, isDeleted: false },
        payload,
        { new: true }
      );

      if (!updated) {
        return {
          success: false,
          message: "Space not found",
        };
      }

      return {
        success: true,
        message: "Space updated successfully",
        data: updated,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update space",
        error: error?.message,
      };
    }
  }

  async deleteSpace(spaceId: string, restore = false): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(spaceId)) {
        return {
          success: false,
          message: "Invalid space ID format",
        };
      }

      const updated = await SpacePortalSpaceModel.findByIdAndUpdate(
        spaceId,
        { isDeleted: !restore },
        { new: true }
      );

      if (!updated) {
        return {
          success: false,
          message: "Space not found",
        };
      }

      return {
        success: true,
        message: restore
          ? "Space restored successfully"
          : "Space deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update space status",
        error: error?.message,
      };
    }
  }

  async uploadSpacePhotos(spaceId: string, photoUrls: string[]): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(spaceId)) {
        return {
          success: false,
          message: "Invalid space ID format",
        };
      }

      const updated = await SpacePortalSpaceModel.findByIdAndUpdate(
        spaceId,
        { $push: { photos: { $each: photoUrls } } },
        { new: true }
      );

      if (!updated) {
        return {
          success: false,
          message: "Space not found",
        };
      }

      return {
        success: true,
        message: "Photos uploaded successfully",
        data: updated,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to upload photos",
        error: error?.message,
      };
    }
  }
}
