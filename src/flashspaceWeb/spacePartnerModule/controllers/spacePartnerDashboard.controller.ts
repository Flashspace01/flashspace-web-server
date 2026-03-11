import { Request, Response } from "express";
import { Space, SpaceStatus } from "../models/space.model";
import { BookingModel } from "../../bookingModule/booking.model";
import mongoose from "mongoose";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.id;
    if (!partnerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const partnerObjectId = new mongoose.Types.ObjectId(partnerId as string);

    // 1. Active Spaces
    const activeSpaces = await Space.countDocuments({
      partnerId: partnerObjectId,
      status: SpaceStatus.ACTIVE,
    });

    // 2. All relevant bookings for this partner
    const allBookings = await BookingModel.find({
      partner: partnerObjectId,
      isDeleted: false,
    })
      .select("user plan.price status createdAt")
      .lean();

    // 3. Total Clients (Unique Users from Bookings)
    const uniqueClients = new Set(allBookings.map((b) => String(b.user)));
    const totalClients = uniqueClients.size;

    // 4. Monthly Revenue
    // Get revenue for the current month from active/completed bookings
    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    let monthlyRevenue = 0;

    // Total pending bookings
    let pendingBookings = 0;

    for (const b of allBookings) {
      if (b.status === "pending_payment" || b.status === "pending_kyc") {
        pendingBookings++;
      }

      // Add to monthly revenue if booking was created this month and is active/completed
      // Alternatively, maybe just sum the price of all active bookings.
      // We'll follow a simple rule: sum plan.price if created this month and active/completed
      if (
        (b.status === "active" ||
          b.status === "completed" ||
          b.status === "pending_kyc") &&
        new Date(b.createdAt as Date) >= startOfMonth
      ) {
        monthlyRevenue += b.plan?.price || 0;
      }
    }

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
    res.status(500).json({ message: "Server error fetching dashboard stats" });
  }
};
