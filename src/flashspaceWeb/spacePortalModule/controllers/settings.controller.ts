import { Request, Response } from "express";
import { SpacePortalSettingsService } from "../services/settings.service";

const settingsService = new SpacePortalSettingsService();

export const getSettings = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const result = await settingsService.getPreferences(userId);
  res.status(result.success ? 200 : 400).json(result);
};

export const updateSettings = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const result = await settingsService.updatePreferences(userId, req.body);
  res.status(result.success ? 200 : 400).json(result);
};
