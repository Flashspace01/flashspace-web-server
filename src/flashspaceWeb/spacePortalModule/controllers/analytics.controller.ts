import { Request, Response } from "express";
import { SpacePortalAnalyticsService } from "../services/analytics.service";

const analyticsService = new SpacePortalAnalyticsService();

export const getBookingAnalytics = async (_req: Request, res: Response) => {
  const result = await analyticsService.getBookingAnalytics();
  res.status(result.success ? 200 : 400).json(result);
};
