import { Request, Response } from "express";
import { BookingModel } from "../../bookingModule/booking.model";
import { UserModel } from "../../authModule/models/user.model";
import mongoose from "mongoose";

import { calculateAffiliateCommission } from "../utils/affiliateCommission";

/**
 * GET /api/affiliate/leaderboard?page=1&limit=10
 * Returns all affiliates ranked by number of successful bookings (active/completed)
 * made using their affiliate coupon code, with pagination.
 */
export const getLeaderboard = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const skip = (page - 1) * limit;

    // 1. Fetch all active affiliates
    const allAffiliates = await UserModel.find({ 
      role: "affiliate", 
      isDeleted: false, 
      isActive: true 
    }).select("fullName").lean();

    // 2. Fetch all matching bookings
    const bookings = await BookingModel.find({
      affiliateId: { $exists: true, $ne: null },
      isDeleted: false,
      status: {
        $in: ["pending_kyc", "pending_documents", "active", "completed"],
      },
    }).lean();

    const statsMap = new Map();
    for (const b of bookings) {
      const affId = b.affiliateId?.toString();
      if (!affId) continue;
      
      const commission = calculateAffiliateCommission(b as any);
      
      if (!statsMap.has(affId)) {
        statsMap.set(affId, { successfulBookings: 0, totalCommission: 0 });
      }
      
      const current = statsMap.get(affId);
      current.successfulBookings += 1;
      current.totalCommission += commission;
    }

    // 3. Combine stats with all affiliates
    const combined = allAffiliates.map(user => {
      const userStats = statsMap.get(user._id.toString()) || { successfulBookings: 0, totalCommission: 0 };
      return {
        _id: user._id,
        fullName: user.fullName || "Affiliate",
        successfulBookings: userStats.successfulBookings,
        totalCommission: userStats.totalCommission
      };
    });

    // 4. Sort by totalCommission DESC, then successfulBookings DESC
    combined.sort((a, b) => {
      if (b.totalCommission !== a.totalCommission) {
        return b.totalCommission - a.totalCommission;
      }
      return b.successfulBookings - a.successfulBookings;
    });

    // 5. Pagination
    const totalEntries = combined.length;
    const totalPages = Math.ceil(totalEntries / limit);
    const paginated = combined.slice(skip, skip + limit);

    // 6. Build leaderboard entries
    const leaderboard = paginated.map((user, index) => {
      const userId = user._id.toString();
      const names = user.fullName.split(" ");
      const initials =
        names.length >= 2
          ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
          : user.fullName.substring(0, 2).toUpperCase();

      return {
        rank: skip + index + 1,
        affiliateId: userId,
        name: user.fullName,
        initials,
        successfulBookings: user.successfulBookings,
        totalCommission: parseFloat(user.totalCommission.toFixed(2)),
        isUser: userId === currentUserId,
      };
    });

    // 7. Find current user's rank across all entries (not just current page)
    const currentUserStatIndex = combined.findIndex(
      (s) => s._id.toString() === currentUserId,
    );
    const currentUserRank =
      currentUserStatIndex >= 0 ? currentUserStatIndex + 1 : null;
    const currentUserStat =
      currentUserStatIndex >= 0 ? combined[currentUserStatIndex] : null;

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        pagination: {
          page,
          limit,
          totalEntries,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        currentUser: currentUserStat
          ? {
              rank: currentUserRank,
              successfulBookings: currentUserStat.successfulBookings,
              totalCommission: parseFloat(
                currentUserStat.totalCommission.toFixed(2),
              ),
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error("Leaderboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leaderboard",
      error: error.message,
    });
  }
};
