import { ApiResponse } from "../../authModule/types/auth.types";
import { SpacePortalNotificationPreferenceModel } from "../models/notificationPreference.model";

export type UpdateSettingsInput = {
  emailUpdates?: boolean;
  bookingAlerts?: boolean;
  smsAlerts?: boolean;
};

export class SpacePortalSettingsService {
  async getPreferences(userId: string): Promise<ApiResponse> {
    try {
      const prefs = await SpacePortalNotificationPreferenceModel.findOne({
        user: userId,
      });

      return {
        success: true,
        message: "Preferences fetched successfully",
        data: prefs,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch preferences",
        error: error?.message,
      };
    }
  }

  async updatePreferences(
    userId: string,
    payload: UpdateSettingsInput
  ): Promise<ApiResponse> {
    try {
      const updated = await SpacePortalNotificationPreferenceModel.findOneAndUpdate(
        { user: userId },
        { $set: payload },
        { new: true, upsert: true }
      );

      return {
        success: true,
        message: "Preferences updated successfully",
        data: updated,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update preferences",
        error: error?.message,
      };
    }
  }
}
