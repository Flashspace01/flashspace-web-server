import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { TicketModel } from "../../ticketModule/models/Ticket";
import { ApiResponse } from "../../authModule/types/auth.types";
import mongoose from "mongoose";

export class SpacePortalDashboardService {
  async getDashboardStats(partnerId: string): Promise<ApiResponse> {
    try {
      if (!partnerId) {
        return {
          success: false,
          message: "Partner ID is required",
        };
      }

      const partnerObjectId = new mongoose.Types.ObjectId(partnerId);

      // We need to aggregate by unique clients (users) who have bookings with this partner.
      const clientsAggregation = await BookingModel.aggregate([
        {
          $match: {
            partner: partnerObjectId,
            isDeleted: { $ne: true },
          },
        },
        // Sort by dates so that we can pick the "latest" booking easily
        {
          $sort: { createdAt: -1 },
        },
        // Group by user to get unique clients
        {
          $group: {
            _id: "$user",
            bookings: { $push: "$$ROOT" },
            // Keep the most recent booking as the primary reference
            latestBooking: { $first: "$$ROOT" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $unwind: "$userDetails",
        },
        {
          $lookup: {
            from: "businessinfos",
            localField: "_id",
            foreignField: "user",
            as: "businessDetails",
          },
        },
        // Add a field to determine the overall client status based on their bookings
        {
          $addFields: {
            // Check if any booking is active
            hasActiveBooking: {
              $anyElementTrue: {
                $map: {
                  input: "$bookings",
                  as: "booking",
                  in: { $eq: ["$$booking.status", "active"] },
                },
              },
            },
            // Get the latest active booking (if any) to determine if it's expiring soon
            latestActiveBooking: {
              $first: {
                $filter: {
                  input: "$bookings",
                  as: "booking",
                  cond: { $eq: ["$$booking.status", "active"] },
                },
              },
            },
          },
        },
        {
          $project: {
            id: {
              $concat: ["CL-", { $substr: [{ $toString: "$_id" }, 18, 6] }],
            },
            companyName: {
              $ifNull: [
                { $arrayElemAt: ["$businessDetails.companyName", 0] },
                "$userDetails.fullName",
              ],
            },
            contactName: "$userDetails.fullName",
            // If they have an active booking, show that plan/space, else show from their latest booking
            plan: {
              $cond: [
                "$hasActiveBooking",
                "$latestActiveBooking.plan.name",
                "$latestBooking.plan.name",
              ],
            },
            space: {
              $cond: [
                "$hasActiveBooking",
                "$latestActiveBooking.spaceSnapshot.name",
                "$latestBooking.spaceSnapshot.name",
              ],
            },
            status: {
              $cond: [
                "$hasActiveBooking",
                {
                  $cond: [
                    {
                      $lte: [
                        "$latestActiveBooking.endDate",
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                      ],
                    },
                    "EXPIRING_SOON",
                    "ACTIVE",
                  ],
                },
                "INACTIVE",
              ],
            },
            kycStatus: {
              $cond: [
                {
                  $cond: [
                    "$hasActiveBooking",
                    { $eq: ["$latestActiveBooking.kycStatus", "approved"] },
                    { $eq: ["$latestBooking.kycStatus", "approved"] },
                  ],
                },
                "VERIFIED",
                "PENDING",
              ],
            },
          },
        },
      ]);

      // Calculate stats from the grouped clients array
      const dashboardStats = {
        total: clientsAggregation.length,
        active: clientsAggregation.filter((c) => c.status === "ACTIVE").length,
        expiringSoon: clientsAggregation.filter(
          (c) => c.status === "EXPIRING_SOON",
        ).length,
        inactive: clientsAggregation.filter((c) => c.status === "INACTIVE")
          .length,
      };

      // 3. Recent Activity (Tickets or Bookings)
      const recentTickets = await TicketModel.find({
        partner: partnerObjectId,
        isDeleted: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      return {
        success: true,
        message: "Dashboard data fetched successfully",
        data: {
          stats: dashboardStats,
          clients: clientsAggregation,
          recentActivity: recentTickets.map((t) => ({
            type: "ticket",
            title: t.subject,
            status: t.status,
            date: t.createdAt,
          })),
        },
      };
    } catch (error: any) {
      console.error("[SpacePortalDashboardService] Error:", error);
      return {
        success: false,
        message: "Failed to fetch dashboard data",
        error: error?.message,
      };
    }
  }
}
