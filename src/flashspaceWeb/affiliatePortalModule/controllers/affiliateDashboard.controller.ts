import { Request, Response } from "express";
import { AffiliateLeadModel, LeadStatus } from "../models/affiliateLead.model";
import { AffiliatePayoutModel, PayoutStatus } from "../models/affiliatePayout.model";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import mongoose from "mongoose";

const COMMISSION_RATE = 0.15;

// Helper: get start of Nth months ago (UTC)
const monthsAgo = (n: number): Date => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const affiliateId = req.user?.id;
    if (!affiliateId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const affObjectId = new mongoose.Types.ObjectId(affiliateId);

    // ── 1. All active bookings ────────────────────────────────────────────────
    const allBookings = await BookingModel.find({
      affiliateId: affObjectId,
      isDeleted: false,
      status: { $in: ["pending_kyc", "pending_documents", "active", "completed"] },
    }).select("plan.price createdAt status").lean();

    const totalClients = allBookings.length;
    const totalEarnings = allBookings.reduce(
      (sum, b) => sum + ((b.plan?.price || 0) * COMMISSION_RATE),
      0
    );

    // ── 2. Pending payout from AffiliatePayout collection ────────────────────
    const pendingPayouts = await AffiliatePayoutModel.find({
      affiliateId: affObjectId,
      status: PayoutStatus.PENDING,
    }).select("amount").lean();

    const pendingPayout = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

    // ── 3. Monthly earnings — last 6 months ───────────────────────────────────
    const sixMonthsAgo = monthsAgo(5); // inclusive: 6 months total

    const monthlyBookings = allBookings.filter(
      (b) => new Date(b.createdAt as Date) >= sixMonthsAgo
    );

    // Build a map keyed by "YYYY-MM"
    const monthMap: Record<string, { earnings: number; clients: number }> = {};

    // Pre-populate last 6 months so gaps show as 0
    for (let i = 5; i >= 0; i--) {
      const d = monthsAgo(i);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = { earnings: 0, clients: 0 };
    }

    for (const b of monthlyBookings) {
      const d = new Date(b.createdAt as Date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      if (monthMap[key]) {
        monthMap[key].earnings += (b.plan?.price || 0) * COMMISSION_RATE;
        monthMap[key].clients += 1;
      }
    }

    const monthlyEarnings = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => {
        const [year, month] = key.split("-");
        return {
          month: `${MONTH_LABELS[parseInt(month, 10) - 1]} ${year.slice(2)}`,
          earnings: parseFloat(val.earnings.toFixed(2)),
          clients: val.clients,
        };
      });

    // ── 4. Lead status breakdown ──────────────────────────────────────────────
    const leads = await AffiliateLeadModel.find({
      affiliateId: affObjectId,
    }).select("status").lean();

    const leadsByStatus = {
      Hot: 0,
      Warm: 0,
      Cold: 0,
      Converted: 0,
    };
    for (const lead of leads) {
      const s = lead.status as LeadStatus;
      if (s === LeadStatus.HOT) leadsByStatus.Hot++;
      else if (s === LeadStatus.WARM) leadsByStatus.Warm++;
      else if (s === LeadStatus.COLD) leadsByStatus.Cold++;
      else if (s === LeadStatus.CONVERTED) leadsByStatus.Converted++;
    }

    // ── 5. MoM growth ─────────────────────────────────────────────────────────
    const sortedKeys = Object.keys(monthMap).sort();
    const currentMonthKey = sortedKeys[sortedKeys.length - 1] ?? "";
    const prevMonthKey = sortedKeys[sortedKeys.length - 2] ?? "";
    const currentMonthEarnings = monthMap[currentMonthKey]?.earnings ?? 0;
    const prevMonthEarnings = monthMap[prevMonthKey]?.earnings ?? 0;

    let momGrowth = 0;
    if (prevMonthEarnings > 0) {
      momGrowth = parseFloat(
        (((currentMonthEarnings - prevMonthEarnings) / prevMonthEarnings) * 100).toFixed(1)
      );
    }

    const stats = {
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      convertedClients: totalClients,
      pendingPayout: parseFloat(pendingPayout.toFixed(2)),
      totalLeads: leads.length,
      commissionRate: COMMISSION_RATE * 100,   // → 15
      monthlyEarnings,
      leadsByStatus,
      momGrowth,
    };

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Server error fetching stats" });
  }
};

export const getAIInsights = async (req: Request, res: Response) => {
  try {
    const affiliateId = req.user?.id;
    if (!affiliateId) return res.status(401).json({ message: "Unauthorized" });

    const affObjectId = new mongoose.Types.ObjectId(affiliateId);

    // Count leads for recommendation
    const totalLeads = await AffiliateLeadModel.countDocuments({ affiliateId: affObjectId });
    const hotLeads = await AffiliateLeadModel.countDocuments({
      affiliateId: affObjectId,
      status: LeadStatus.HOT,
    });

    const insights = {
      renewal: {
        title: "Revenue Insights",
        recommendation:
          totalLeads > 0
            ? `You have ${hotLeads} hot lead${hotLeads !== 1 ? "s" : ""} ready for conversion. Follow up now to maximise commission this month.`
            : "Start adding leads to unlock personalised AI revenue insights.",
        metrics: [
          {
            label: "Hot Leads",
            value: String(hotLeads),
            subtext: "High-priority conversion opportunities",
            trend: hotLeads > 0 ? "🔥" : "",
          },
          {
            label: "Total Commission Rate",
            value: "15%",
            subtext: "Per successful booking",
          },
        ],
      },
    };

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error("Error generating insights:", error);
    res.status(500).json({ message: "Server error generating insights" });
  }
};
