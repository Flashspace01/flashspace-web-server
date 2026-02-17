import { ApiResponse } from "../../authModule/types/auth.types";
import { SpacePortalCalendarBookingModel } from "../models/calendarBooking.model";
import { SpacePortalBookingRequestModel } from "../models/bookingRequest.model";

export class SpacePortalAnalyticsService {
  async getBookingAnalytics(): Promise<ApiResponse> {
    try {
      const totalBookings = await SpacePortalCalendarBookingModel.countDocuments({
        isDeleted: false,
      });
      const cancelledBookings = await SpacePortalCalendarBookingModel.countDocuments(
        { status: "CANCELLED", isDeleted: false }
      );

      // Active clients: distinct clientName from confirmed bookings
      const activeClientsAgg = await SpacePortalCalendarBookingModel.aggregate([
        { $match: { status: "CONFIRMED", isDeleted: false } },
        { $group: { _id: "$clientName" } },
        { $count: "count" },
      ]);
      const activeClients = activeClientsAgg[0]?.count || 0;

      // Pending requests: from booking requests collection
      const pendingRequests = await SpacePortalBookingRequestModel.countDocuments({
        status: "PENDING",
        isDeleted: false,
      });

      // Revenue this month / last month (no price in calendar booking yet)
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      const revenueThisMonthAgg = await SpacePortalCalendarBookingModel.aggregate([
        { $match: { createdAt: { $gte: startOfThisMonth }, isDeleted: false } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } },
      ]);
      const revenueLastMonthAgg = await SpacePortalCalendarBookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
            isDeleted: false,
          },
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } },
      ]);

      const revenueThisMonth = revenueThisMonthAgg[0]?.total || 0;
      const revenueLastMonth = revenueLastMonthAgg[0]?.total || 0;

      // Plan division (from planName)
      const planDivision = await SpacePortalCalendarBookingModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: { $ifNull: ["$planName", "Unknown"] },
            bookings: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
        { $project: { _id: 0, plan: "$_id", bookings: 1, revenue: 1 } },
      ]);

      // Space division
      const spaceDivision = await SpacePortalCalendarBookingModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: "$space",
            bookings: { $sum: 1 },
          },
        },
        { $project: { _id: 0, space: "$_id", bookings: 1, revenue: { $literal: 0 } } },
      ]);

      // Revenue trend (last 6 months) based on bookings count
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const trend = await SpacePortalCalendarBookingModel.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo }, isDeleted: false } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            bookings: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      const monthLabels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const revenueTrend = trend.map((t) => ({
        month: monthLabels[t._id.month - 1],
        revenue: t.revenue || 0,
        bookings: t.bookings,
      }));

      return {
        success: true,
        message: "Booking analytics fetched successfully",
        data: {
          summary: {
            totalBookings,
            activeClients,
            cancelledBookings,
            pendingRequests,
            revenueThisMonth,
            revenueLastMonth,
          },
          planDivision,
          spaceDivision,
          revenueTrend,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch analytics",
        error: error?.message,
      };
    }
  }
}
