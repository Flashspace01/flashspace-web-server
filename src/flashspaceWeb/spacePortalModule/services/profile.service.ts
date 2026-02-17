import { ApiResponse } from "../../authModule/types/auth.types";
import { SpacePortalProfileModel } from "../models/profile.model";

export type UpdateProfileInput = {
  company?: string;
  location?: string;
};

export class SpacePortalProfileService {
  async getProfile(userId: string): Promise<ApiResponse> {
    try {
      const profile = await SpacePortalProfileModel.findOne({ user: userId });
      return {
        success: true,
        message: "Profile fetched successfully",
        data: profile,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch profile",
        error: error?.message,
      };
    }
  }

  async updateProfile(
    userId: string,
    payload: UpdateProfileInput
  ): Promise<ApiResponse> {
    try {
      const updated = await SpacePortalProfileModel.findOneAndUpdate(
        { user: userId },
        { $set: payload },
        { new: true, upsert: true }
      );

      return {
        success: true,
        message: "Profile updated successfully",
        data: updated,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update profile",
        error: error?.message,
      };
    }
  }
}
