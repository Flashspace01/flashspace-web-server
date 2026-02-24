import { Request, Response } from "express";
import { AffiliateLeadModel, LeadStatus } from "../models/affiliateLead.model";
import { AffiliatePayoutModel, PayoutStatus } from "../models/affiliatePayout.model";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import mongoose from "mongoose";

const COMMISSION_RATE = 0.15;

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Ideally, get affiliate ID from authenticated user (req.user)
    // For now, assuming middleware populates req.user or passed as param for dev
    const affiliateId = req.user?.id;

    if (!affiliateId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const affObjectId = new mongoose.Types.ObjectId(affiliateId);

    // 1. Fetch all matching bookings (active, completed, or pending_kyc)
    const activeBookings = await BookingModel.find({
      affiliateId: affObjectId,
      isDeleted: false,
      status: { $in: ["pending_kyc", "pending_documents", "active", "completed"] }
    });

    const totalClients = activeBookings.length;
    const totalEarnings = activeBookings.reduce((sum, b) => {
      return sum + ((b.plan?.price || 0) * COMMISSION_RATE);
    }, 0);

    // 2. Pending Payout (Static ₹0 for now as requested, or fetch from PayoutModel if exists)
    // The user specifically asked for pending payout to be static
    const pendingPayout = 0;

    const stats = {
      totalReferrals: 0, // Not requested for display now
      convertedClients: totalClients,
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      pendingPayout,
    };

    res.status(200).json({ success: true, data: stats });
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
