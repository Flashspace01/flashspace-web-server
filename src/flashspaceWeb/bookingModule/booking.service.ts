import { BookingModel } from "./booking.model";
import { KYCDocumentModel } from "../userDashboardModule/models/kyc.model";
import mongoose from "mongoose";

export class BookingService {
  static async getAllBookings(
    userId: string,
    type?: string,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const filter: any = { user: userId, isDeleted: false };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      BookingModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      BookingModel.countDocuments(filter),
    ]);

    const bookingsWithDays = bookings.map((b) => {
      const booking = b.toObject() as any;
      if (booking.endDate) {
        const now = new Date();
        const end = new Date(booking.endDate);
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        booking.daysRemaining = diffDays > 0 ? diffDays : 0;
      }
      return booking;
    });

    return {
      bookings: bookingsWithDays,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getBookingById(userId: string, bookingId: string) {
    const booking = await BookingModel.findOne({
      _id: bookingId,
      user: userId,
      isDeleted: false,
    });

    if (!booking) return null;

    const bookingObj = booking.toObject() as any;
    if (bookingObj.endDate) {
      const now = new Date();
      const end = new Date(bookingObj.endDate);
      const diffTime = end.getTime() - now.getTime();
      bookingObj.daysRemaining = Math.max(
        0,
        Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
      );
    }

    return bookingObj;
  }

  static async getBookingsByProperty(
    userId: string,
    spaceId: string,
    year?: number,
    month?: number,
  ) {
    const filter: any = {
      user: userId,
      spaceId: new mongoose.Types.ObjectId(spaceId),
      isDeleted: false,
    };

    if (year || month) {
      const dateFilter: any = {};
      const now = new Date();
      const currentYear = year || now.getFullYear();

      if (month) {
        const monthIndex = month - 1;
        const startDate = new Date(currentYear, monthIndex, 1);
        const endDate = new Date(
          currentYear,
          monthIndex + 1,
          0,
          23,
          59,
          59,
          999,
        );
        dateFilter.$gte = startDate;
        dateFilter.$lte = endDate;
      } else {
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
        dateFilter.$gte = startDate;
        dateFilter.$lte = endDate;
      }
      filter.createdAt = dateFilter;
    }

    return await BookingModel.find(filter)
      .populate("user")
      .sort({ createdAt: -1 });
  }

  static async toggleAutoRenew(
    userId: string,
    bookingId: string,
    autoRenew: boolean,
  ) {
    const booking = await BookingModel.findOneAndUpdate(
      { _id: bookingId, user: userId, isDeleted: false },
      { autoRenew, updatedAt: new Date() },
      { new: true },
    );
    return booking;
  }

  static async linkBookingToProfile(
    userId: string,
    bookingId: string,
    profileId: string,
  ) {
    const profile = await KYCDocumentModel.findOne({
      _id: profileId,
      user: userId,
    });
    if (!profile) throw new Error("Profile not found");
    if (profile.overallStatus !== "approved")
      throw new Error("Profile must be approved before linking");

    const booking = await BookingModel.findOne({
      _id: bookingId,
      user: userId,
    });
    if (!booking) throw new Error("Booking not found");

    // Preserve previous state for potential rollback
    const prevKycProfile = booking.kycProfile;
    const prevKycStatus = booking.kycStatus;
    const prevStatus = booking.status;
    const prevStartDate = booking.startDate;
    const prevEndDate = booking.endDate;

    booking.kycProfile = new mongoose.Types.ObjectId(profileId) as any;
    booking.kycStatus = "approved";
    booking.status = "active";

    if (!booking.startDate) booking.startDate = new Date();
    if (!booking.endDate) {
      const endDate = new Date(booking.startDate);
      endDate.setMonth(endDate.getMonth() + (booking.plan?.tenure || 12));
      booking.endDate = endDate;
    }

    await booking.save();

    try {
      if (!profile.linkedBookings?.includes(bookingId)) {
        profile.linkedBookings = profile.linkedBookings || [];
        profile.linkedBookings.push(bookingId);
        await profile.save();
      }
      return booking;
    } catch (error) {
      // Manual Rollback if profile save fails (Standalone DB safe)
      booking.kycProfile = prevKycProfile;
      booking.kycStatus = prevKycStatus as any;
      booking.status = prevStatus as any;
      booking.startDate = prevStartDate;
      booking.endDate = prevEndDate;
      await booking.save();
      throw new Error("Failed to link profile, changes rolled back.");
    }
  }

  static async getPartnerSpaceBookings(
    partnerId: string,
    spaceId: string,
    month?: string,
    year?: string,
  ) {
    const filter: any = {
      spaceId,
      partner: partnerId,
      isDeleted: false,
    };

    let startDate: Date, endDate: Date;
    const now = new Date();
    const currentYear = year ? parseInt(year) : now.getFullYear();

    if (month) {
      const monthIndex = parseInt(month) - 1;
      startDate = new Date(currentYear, monthIndex, 1);
      endDate = new Date(currentYear, monthIndex + 1, 0, 23, 59, 59);
    } else {
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59);
    }

    filter.$or = [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
    ];

    return await BookingModel.find(filter)
      .populate("user", "fullName email phone")
      .sort({ startDate: -1 });
  }

  static async getPartnerDashboardOverview(partnerId: string) {
    const partnerBookings = await BookingModel.find({
      partner: partnerId,
      isDeleted: false,
    }).populate("user", "fullName email phone company");

    return partnerBookings.map((b: any) => {
      let status = "INACTIVE";
      if (b.status === "active") {
        if (b.endDate) {
          const now = new Date();
          const end = new Date(b.endDate);
          const diffDays = Math.ceil(
            (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          status = diffDays <= 7 ? "EXPIRING_SOON" : "ACTIVE";
        } else {
          status = "ACTIVE";
        }
      }

      let planName = b.plan?.name || "Standard";
      if (b.type === "virtual_office") planName = "Virtual Office " + planName;
      if (b.type === "coworking_space") planName = "Coworking " + planName;

      return {
        id: b.bookingNumber || b._id.toString(),
        companyName: b.user?.company || b.user?.fullName || "N/A",
        contactName: b.user?.fullName || "N/A",
        plan: planName,
        space: b.spaceSnapshot?.name || "Unknown Space",
        startDate: b.startDate
          ? new Date(b.startDate).toISOString().split("T")[0]
          : "N/A",
        endDate: b.endDate
          ? new Date(b.endDate).toISOString().split("T")[0]
          : "N/A",
        status:
          b.status === "active"
            ? b.endDate &&
              new Date(b.endDate).getTime() - new Date().getTime() <=
                7 * 24 * 60 * 60 * 1000
              ? "EXPIRING_SOON"
              : "ACTIVE"
            : "INACTIVE",
        kycStatus: b.kycStatus === "approved" ? "VERIFIED" : "PENDING",
      };
    });
  }

  static async getPartnerSpaceBookingAnalytics(partnerId: string) {
    const partnerBookings = await BookingModel.find({
      partner: partnerId,
      isDeleted: false,
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    let totalBookings = 0;
    let cancelledBookings = 0;
    let pendingRequests = 0;
    const activeClientsSet = new Set();

    let revenueThisMonth = 0;
    let revenueLastMonth = 0;

    const planData: Record<string, { bookings: number; revenue: number }> = {};
    const spaceData: Record<string, { bookings: number; revenue: number }> = {};
    const trendData: Record<string, number> = {};

    // Initialize last 6 months for trend
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString("default", { month: "short" });
      trendData[monthLabel] = 0;
    }

    partnerBookings.forEach((b: any) => {
      totalBookings++;
      if (b.status === "cancelled") cancelledBookings++;
      if (b.status === "pending_payment" || b.status === "pending_kyc")
        pendingRequests++;

      if (b.status === "active") {
        activeClientsSet.add(b.user.toString());
      }

      const revenue = b.plan?.finalPrice || b.plan?.price || 0;
      const createdAt = new Date(b.createdAt);

      // Revenue compare
      if (createdAt >= currentMonthStart) {
        revenueThisMonth += revenue;
      } else if (createdAt >= lastMonthStart && createdAt <= lastMonthEnd) {
        revenueLastMonth += revenue;
      }

      // Trend
      const monthLabel = createdAt.toLocaleString("default", {
        month: "short",
      });
      if (trendData[monthLabel] !== undefined) {
        trendData[monthLabel] += revenue;
      }

      // Plan Division
      const planName = b.plan?.name || "Standard";
      if (!planData[planName]) planData[planName] = { bookings: 0, revenue: 0 };
      planData[planName].bookings++;
      planData[planName].revenue += revenue;

      // Space Division
      const spaceName = b.spaceSnapshot?.name || "Unknown Space";
      if (!spaceData[spaceName])
        spaceData[spaceName] = { bookings: 0, revenue: 0 };
      spaceData[spaceName].bookings++;
      spaceData[spaceName].revenue += revenue;
    });

    return {
      summary: {
        totalBookings,
        activeClients: activeClientsSet.size,
        cancelledBookings,
        pendingRequests,
        revenueThisMonth,
        revenueLastMonth,
      },
      revenueTrend: Object.keys(trendData).map((month) => ({
        month,
        revenue: trendData[month],
      })),
      planDivision: Object.keys(planData).map((plan) => ({
        plan,
        ...planData[plan],
      })),
      spaceDivision: Object.keys(spaceData).map((space) => ({
        space,
        ...spaceData[space],
      })),
    };
  }
}
