import { Request, Response } from "express";
import { SpacePortalProfileService } from "../services/profile.service";

const profileService = new SpacePortalProfileService();

export const getProfile = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const result = await profileService.getProfile(userId);
  res.status(result.success ? 200 : 400).json(result);
};

export const updateProfile = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const result = await profileService.updateProfile(userId, req.body);
  res.status(result.success ? 200 : 400).json(result);
};
