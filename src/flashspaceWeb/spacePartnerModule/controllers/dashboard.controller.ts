import { Request, Response } from "express";
import { Space, SpaceStatus } from "../models/space.model";
import { BookingModel } from "../../bookingModule/booking.model";
import mongoose from "mongoose";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.id;
    const partnerObjectId = new mongoose.Types.ObjectId(partnerId);

    // 1. Active Spaces
    const activeSpaces = await Space.countDocuments({
      partnerId: partnerObjectId,
      status: SpaceStatus.ACTIVE,
    });

    // 2. Total Clients (Unique users with bookings)
    const clients = await BookingModel.distinct("user", {
      partner: partnerObjectId,
      isDeleted: { $ne: true },
    });
    const totalClients = clients.length;

    // 3. Monthly Revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const revenueAggregation = await BookingModel.aggregate([
      {
        $match: {
          partner: partnerObjectId,
          isDeleted: { $ne: true },
          createdAt: { $gte: startOfMonth },
          status: { $in: ["active", "pending_kyc", "pending_payment"] }, // Count revenue even if pending payment for now, or just completed?
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$plan.price" },
        },
      },
    ]);
    const monthlyRevenue =
      revenueAggregation.length > 0 ? revenueAggregation[0].total : 0;

    // 4. Pending Bookings
    const pendingBookings = await BookingModel.countDocuments({
      partner: partnerObjectId,
      status: { $in: ["pending_payment", "pending_kyc"] },
      isDeleted: { $ne: true },
    });

    res.status(200).json({
      success: true,
      data: {
        activeSpaces,
        totalClients,
        monthlyRevenue,
        pendingBookings,
      },
    });
  } catch (error) {
    console.error("Error fetching space partner dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard stats",
      error,
    });
  }
};
