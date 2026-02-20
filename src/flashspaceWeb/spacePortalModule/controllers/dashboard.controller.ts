import { Request, Response } from "express";
import { SpacePortalDashboardService } from "../services/dashboard.service";

const dashboardService = new SpacePortalDashboardService();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const partnerId = req.user?.id;
    if (!partnerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Partner ID missing",
      });
    }

    const result = await dashboardService.getDashboardStats(partnerId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[DashboardController] Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred",
      error: error?.message,
    });
  }
};
