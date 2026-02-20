import { Request, Response } from "express";
import { AffiliateLeadModel, LeadStatus } from "../models/affiliateLead.model";
import { AffiliatePayoutModel, PayoutStatus } from "../models/affiliatePayout.model";
import { AffiliateCampaignModel } from "../models/affiliateCampaign.model";
import { AffiliateBookingModel, BookingStatus } from "../models/affiliateBooking.model";
import { UserModel } from "../../authModule/models/user.model";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Ideally, get affiliate ID from authenticated user (req.user)
    // For now, assuming middleware populates req.user or passed as param for dev
    const affiliateId = req.user?.id; 
    
    if (!affiliateId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [
      totalReferrals,
      convertedClients,
      totalEarnings,
      pendingPayout
    ] = await Promise.all([
      AffiliateLeadModel.countDocuments({ affiliateId }),
      AffiliateBookingModel.countDocuments({ affiliateId, status: BookingStatus.ACTIVE }),
      AffiliatePayoutModel.aggregate([
        { $match: { affiliateId, status: PayoutStatus.PROCESSING } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      AffiliatePayoutModel.aggregate([
        { $match: { affiliateId, status: PayoutStatus.PENDING } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    const stats = {
      totalReferrals,
      convertedClients,
      totalEarnings: totalEarnings[0]?.total || 0,
      pendingPayout: pendingPayout[0]?.total || 0,
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Server error fetching stats" });
  }
};

export const getAIInsights = async (req: Request, res: Response) => {
    // Mock AI insights for now, eventually this could call an AI service
    const insights = {
        renewal: {
            title: "Renewal Forecasting",
            recommendation: "Focus on follow-ups with high-potential leads this week.",
            metrics: [
                { label: "Expected Renewals", value: "28", subtext: "Clients likely to renew this quarter", trend: "+8%" },
                { label: "Potential Revenue", value: "₹8.4L", subtext: "From expected renewals" }
            ]
        },
        // ... extend as needed matching frontend structure
    };
    res.json(insights);
}
