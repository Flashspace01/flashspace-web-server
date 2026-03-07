import { Request, Response } from "express";
import { BookingModel } from "../../bookingModule/booking.model";
import { UserModel } from "../../authModule/models/user.model";

/**
 * GET /api/admin/finance/summary
 * Returns receivables (clients with pending/overdue payments)
 * and payables (partner payout summary aggregated from bookings).
 */
export const getFinanceSummary = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    // ─── RECEIVABLES ───────────────────────────────────────────────────────────
    // Bookings still in "pending_payment" or "pending_kyc" status = client owes us money
    const pendingBookings = await BookingModel.find({
      status: { $in: ["pending_payment", "pending_kyc"] },
      isDeleted: { $ne: true },
    })
      .populate("user", "fullName email")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const receivables = pendingBookings.map((b: any) => {
      const dueDate = b.createdAt ? new Date(b.createdAt) : now;
      // Add 15-day payment window
      dueDate.setDate(dueDate.getDate() + 15);
      const diffDays = Math.round(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      let status: "current" | "upcoming" | "overdue";
      if (diffDays < 0) status = "overdue";
      else if (diffDays <= 5) status = "current";
      else status = "upcoming";

      return {
        _id: b._id,
        client: (b.user as any)?.fullName || "Unknown Client",
        email: (b.user as any)?.email || "",
        amount: b.amount || 0,
        bookingNumber:
          b.bookingNumber || b._id.toString().slice(-8).toUpperCase(),
        type: b.type || "booking",
        dueDate: dueDate.toISOString(),
        ageDays: diffDays,
        status,
      };
    });

    // ─── TOTALS ────────────────────────────────────────────────────────────────
    const totalReceivable = receivables.reduce((s, r) => s + r.amount, 0);
    const overdueReceivable = receivables
      .filter((r) => r.status === "overdue")
      .reduce((s, r) => s + r.amount, 0);

    // ─── PAYABLES ──────────────────────────────────────────────────────────────
    // For payables, aggregate active bookings by space partner (spaceSnapshot.partnerName or spaceId)
    const payableAgg = await BookingModel.aggregate([
      {
        $match: {
          status: { $in: ["active", "completed"] },
          isDeleted: { $ne: true },
          "spaceSnapshot.partnerName": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            partnerName: "$spaceSnapshot.partnerName",
            city: "$spaceSnapshot.city",
          },
          totalRevenue: { $sum: "$amount" },
          bookingCount: { $sum: 1 },
          lastBooking: { $max: "$createdAt" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 },
    ]);

    // Assume 70% payout ratio to partner
    const PAYOUT_RATIO = 0.7;
    const payables = payableAgg.map((p) => {
      const payoutAmount = Math.round(p.totalRevenue * PAYOUT_RATIO);
      const lastBookingDate = p.lastBooking ? new Date(p.lastBooking) : now;
      // Payout due 30 days after last booking
      const dueDate = new Date(lastBookingDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const diffDays = Math.round(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      let status: "scheduled" | "pending" | "overdue";
      if (diffDays < 0) status = "overdue";
      else if (diffDays <= 7) status = "pending";
      else status = "scheduled";

      return {
        partner: p._id.partnerName,
        city: p._id.city || "",
        amount: payoutAmount,
        totalRevenue: p.totalRevenue,
        bookingCount: p.bookingCount,
        dueDate: dueDate.toISOString(),
        ageDays: diffDays,
        status,
      };
    });

    const totalPayable = payables.reduce((s, p) => s + p.amount, 0);
    const dueThisWeek = payables
      .filter((p) => p.ageDays >= 0 && p.ageDays <= 7)
      .reduce((s, p) => s + p.amount, 0);

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalReceivable,
          overdueReceivable,
          totalPayable,
          dueThisWeek,
        },
        receivables,
        payables,
      },
    });
  } catch (error) {
    console.error("[Finance] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch finance summary",
    });
  }
};

/**
 * GET /api/admin/finance/balance-sheet
 * Returns overall financial summary, monthly breakdown, and city-wise breakdown.
 */
export const getBalanceSheet = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Parse dates if provided, else default to FYTD
    const queryStartDate = startDate
      ? new Date(startDate as string)
      : startOfYear;
    const queryEndDate = endDate ? new Date(endDate as string) : now;

    // Derivation constants
    const PAYOUT_RATIO = 0.7; // 70% to partners
    const OPERATING_RATIO = 0.1; // 10% operating costs
    const MARKETING_RATIO = 0.1; // 10% marketing expenses

    // 1️⃣ Overall Summary
    const fyQuery = {
      status: { $in: ["active", "completed"] },
      isDeleted: { $ne: true },
      createdAt: { $gte: queryStartDate, $lte: queryEndDate },
    };

    const bookings = await BookingModel.find(fyQuery).lean();

    const totalRevenue = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const partnerPayouts = Math.round(totalRevenue * PAYOUT_RATIO);
    const operatingCosts = Math.round(totalRevenue * OPERATING_RATIO);
    const marketingExpenses = Math.round(totalRevenue * MARKETING_RATIO);
    const totalExpenses = partnerPayouts + operatingCosts + marketingExpenses;
    const netProfit = totalRevenue - totalExpenses;

    const overallSummary = [
      { label: "Total Revenue", amount: totalRevenue, type: "credit" },
      { label: "Total Expenses", amount: totalExpenses, type: "debit" },
      { label: "Partner Payouts", amount: partnerPayouts, type: "debit" },
      { label: "Operating Costs", amount: operatingCosts, type: "debit" },
      { label: "Net Profit", amount: netProfit, type: "profit" },
    ];

    // 2️⃣ Monthly Breakdown
    const monthlyAgg = await BookingModel.aggregate([
      {
        $match: {
          status: { $in: ["active", "completed"] },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthlyBreakdown = monthlyAgg.map((m) => {
      const revenue = m.revenue;
      const expenses = Math.round(
        revenue * (PAYOUT_RATIO + OPERATING_RATIO + MARKETING_RATIO),
      );
      const profit = revenue - expenses;
      return {
        month: `${months[m._id.month - 1]} ${m._id.year}`,
        revenue,
        expenses,
        profit,
      };
    });

    // 3️⃣ City-wise Breakdown
    const cityAgg = await BookingModel.aggregate([
      {
        $match: {
          status: { $in: ["active", "completed"] },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$spaceSnapshot.city",
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    const cityBreakdown = cityAgg.map((c) => {
      const revenue = c.revenue;
      const expenses = Math.round(
        revenue * (PAYOUT_RATIO + OPERATING_RATIO + MARKETING_RATIO),
      );
      const profit = revenue - expenses;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      return {
        city: c._id || "Other",
        revenue,
        expenses,
        profit,
        margin: `${margin}%`,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        overallSummary,
        monthlyBreakdown,
        cityBreakdown,
      },
    });
  } catch (error) {
    console.error("[BalanceSheet] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch balance sheet",
    });
  }
};
