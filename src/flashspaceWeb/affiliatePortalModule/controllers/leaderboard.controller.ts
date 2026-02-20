import { Request, Response } from "express";
import { QuotationModel, QuotationStatus } from "../models/quotation.model";
import { AffiliateLeadModel } from "../models/affiliateLead.model";
import { UserModel } from "../../authModule/models/user.model";
import { Types } from "mongoose";



interface LeaderboardEntry {
    affiliateId: string;
    name: string;
    location: string;
    referrals: number;
    earnings: number;
    conversion: number;
    initials: string;
    isUser: boolean;
}

/**
 * Get leaderboard data
 */
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
    try {
        const currentUserId = req.user?.id;

        // 1. Aggregate Quotations for Earnings and Accepted Counts
        const quotationStats = await QuotationModel.aggregate([
            {
                $group: {
                    _id: "$affiliateId",
                    totalEarnings: {
                        $sum: {
                            $cond: [{ $eq: ["$status", QuotationStatus.ACCEPTED] }, "$price", 0]
                        }
                    },
                    acceptedCount: {
                        $sum: {
                            $cond: [{ $eq: ["$status", QuotationStatus.ACCEPTED] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // 2. Aggregate Leads for Total Referrals
        const leadStats = await AffiliateLeadModel.aggregate([
            {
                $group: {
                    _id: "$affiliateId",
                    totalLeads: { $sum: 1 }
                }
            }
        ]);

        // 3. Map stats to a dictionary for easy lookup
        const statsMap: Record<string, { earnings: number; accepted: number; leads: number }> = {};

        quotationStats.forEach(stat => {
            const id = stat._id.toString();
            if (!statsMap[id]) statsMap[id] = { earnings: 0, accepted: 0, leads: 0 };
            statsMap[id].earnings = stat.totalEarnings;
            statsMap[id].accepted = stat.acceptedCount;
        });

        leadStats.forEach(stat => {
            const id = stat._id.toString();
            if (!statsMap[id]) statsMap[id] = { earnings: 0, accepted: 0, leads: 0 };
            statsMap[id].leads = stat.totalLeads;
        });

        // 4. Fetch User Details for all affiliates found
        const affiliateIds = Object.keys(statsMap);
        const users = await UserModel.find({ _id: { $in: affiliateIds } }).select("fullName");

        // 5. Build Leaderboard
        const leaderboard: LeaderboardEntry[] = users.map(user => {
            const id = user._id.toString();
            const stats = statsMap[id] || { earnings: 0, accepted: 0, leads: 0 };
            const conversion = stats.leads > 0 ? (stats.accepted / stats.leads) * 100 : 0;
            
            // Generate initials
            const names = user.fullName.split(" ");
            const initials = names.length >= 2 
                ? `${names[0][0]}${names[1][0]}`.toUpperCase() 
                : user.fullName.substring(0, 2).toUpperCase();

            // Commission logic: Assuming 10% commission on earnings
            const commission = stats.earnings * 0.10;

            return {
                affiliateId: id,
                name: user.fullName,
                location: "Global", // Placeholder
                referrals: stats.leads,
                earnings: commission, // Sent as number, formatted on frontend
                conversion: Math.round(conversion),
                initials,
                isUser: id === currentUserId,
            };
        });

        // 6. Sort by earnings (descending)
        leaderboard.sort((a, b) => b.earnings - a.earnings);

        // 7. Limit to top 10 (or more if needed)
        const topLeaderboard = leaderboard.slice(0, 10);

        res.status(200).json({
            success: true,
            data: topLeaderboard,
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
