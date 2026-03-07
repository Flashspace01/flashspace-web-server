import { Request, Response } from "express";
import { UserModel, UserRole } from "../../authModule/models/user.model";
import { SupportTicketModel } from "../../userDashboardModule/models/supportTicket.model";
import { Types } from "mongoose";

/**
 * GET /api/admin/leaderboard
 * Returns leaderboard data for both sales and support teams.
 * - Sales: All users with role=sales, sorted by a placeholder metric for now
 * - Support: Aggregated from SupportTicket.assignedTo, counting tickets resolved/assigned
 */
export const getAdminLeaderboard = async (req: Request, res: Response) => {
  try {
    // ─── SUPPORT LEADERBOARD ───────────────────────────────────────────────
    // Aggregate tickets grouped by assignedTo
    const supportAgg = await SupportTicketModel.aggregate([
      {
        $match: {
          assignedTo: { $exists: true, $ne: null },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          totalTickets: { $sum: 1 },
          resolvedTickets: {
            $sum: {
              $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0],
            },
          },
          avgResolutionMs: {
            $avg: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ["$resolvedAt", false] },
                    { $ifNull: ["$createdAt", false] },
                  ],
                },
                { $subtract: ["$resolvedAt", "$createdAt"] },
                null,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          fullName: "$user.fullName",
          email: "$user.email",
          role: "$user.role",
          totalTickets: 1,
          resolvedTickets: 1,
          avgResolutionMs: 1,
        },
      },
      { $sort: { resolvedTickets: -1, totalTickets: -1 } },
    ]);

    // ─── SALES LEADERBOARD ─────────────────────────────────────────────────
    // Get all users with role = sales
    const salesUsers = await UserModel.find(
      {
        role: { $in: [UserRole.SALES, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
        isDeleted: false,
      },
      { fullName: 1, email: 1, role: 1, createdAt: 1 },
    ).lean();

    // For sales we don't have a specific "deal" model tracked per-sales-agent
    // so we return the user list ordered by creation date (earliest = most senior)
    // The frontend can display this with placeholder metrics until a deal tracking system is added.
    const salesLeaderboard = salesUsers.map((u, idx) => ({
      _id: u._id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      rank: idx + 1,
    }));

    // Build support leaderboard with rank + formatted resolution time
    const supportLeaderboard = supportAgg.map((entry, idx) => {
      const avgMs = entry.avgResolutionMs;
      let resolution = "N/A";
      if (avgMs && avgMs > 0) {
        const hours = Math.floor(avgMs / (1000 * 60 * 60));
        const mins = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
        resolution = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
      }

      return {
        ...entry,
        rank: idx + 1,
        resolution,
        resolutionRate:
          entry.totalTickets > 0
            ? Math.round((entry.resolvedTickets / entry.totalTickets) * 100)
            : 0,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        sales: salesLeaderboard,
        support: supportLeaderboard,
      },
    });
  } catch (error) {
    console.error("[Leaderboard] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leaderboard data",
    });
  }
};
