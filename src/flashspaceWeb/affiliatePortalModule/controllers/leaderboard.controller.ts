import { Request, Response } from "express";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { UserModel } from "../../authModule/models/user.model";
import mongoose from "mongoose";

const COMMISSION_RATE = 0.15; // 15%

/**
 * GET /api/affiliate/leaderboard?page=1&limit=10
 * Returns all affiliates ranked by number of successful bookings (active/completed)
 * made using their affiliate coupon code, with pagination.
 */
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
    try {
        const currentUserId = req.user?.id;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
        const skip = (page - 1) * limit;

        // 1. Aggregate bookings by affiliateId — count & commission
        const stats = await BookingModel.aggregate([
            {
                $match: {
                    affiliateId: { $exists: true, $ne: null },
                    isDeleted: false,
                    // Count all paid bookings: pending_kyc = payment received (most common after simulate)
                    status: { $in: ["pending_kyc", "pending_documents", "active", "completed"] },
                },
            },
            {
                $group: {
                    _id: "$affiliateId",
                    successfulBookings: { $sum: 1 },
                    // Commission per booking: plan.price (paid amount) * 15%
                    totalCommission: {
                        $sum: {
                            $multiply: [
                                { $ifNull: ["$plan.price", 0] },
                                COMMISSION_RATE,
                            ],
                        },
                    },
                },
            },
            { $sort: { successfulBookings: -1, totalCommission: -1 } },
        ]);

        // 2. Total count before pagination
        const totalEntries = stats.length;
        const totalPages = Math.ceil(totalEntries / limit);
        const paginated = stats.slice(skip, skip + limit);

        // 3. Fetch user details for paginated slice
        const affiliateIds = paginated.map((s) => s._id);
        const users = await UserModel.find({ _id: { $in: affiliateIds } })
            .select("fullName")
            .lean();

        const userMap: Record<string, any> = {};
        users.forEach((u: any) => {
            userMap[u._id.toString()] = u;
        });

        // 4. Build leaderboard entries (global rank = skip + index + 1)
        const leaderboard = paginated.map((stat, index) => {
            const userId = stat._id.toString();
            const user = userMap[userId] || {};
            const name = user.fullName || "Affiliate";
            const names = name.split(" ");
            const initials =
                names.length >= 2
                    ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
                    : name.substring(0, 2).toUpperCase();

            return {
                rank: skip + index + 1,
                affiliateId: userId,
                name,
                initials,
                successfulBookings: stat.successfulBookings,
                totalCommission: parseFloat(stat.totalCommission.toFixed(2)),
                isUser: userId === currentUserId,
            };
        });

        // 5. Find current user's rank across all entries (not just current page)
        const currentUserStatIndex = stats.findIndex((s) => s._id.toString() === currentUserId);
        const currentUserRank = currentUserStatIndex >= 0 ? currentUserStatIndex + 1 : null;
        const currentUserStat = currentUserStatIndex >= 0 ? stats[currentUserStatIndex] : null;

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
                        totalCommission: parseFloat(currentUserStat.totalCommission.toFixed(2)),
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
