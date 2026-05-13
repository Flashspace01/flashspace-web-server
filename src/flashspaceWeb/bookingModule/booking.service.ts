import { BookingModel } from "./booking.model";
import { KYCDocumentModel } from "../userDashboardModule/models/kyc.model";
import { VirtualOfficeModel } from "../virtualOfficeModule/virtualOffice.model";
import { CoworkingSpaceModel } from "../coworkingSpaceModule/coworkingSpace.model";
import { MeetingRoomModel } from "../meetingRoomModule/meetingRoom.model";
import { SeatBookingModel } from "../seatingModule/seating.model";
import { PaymentModel, PaymentStatus } from "../paymentModule/payment.model";
import { BookingDocumentRecordModel } from "./bookingDocument.model";
import { BusinessInfoModel } from "../userDashboardModule/models/businessInfo.model";
import { PartnerKYCModel } from "../userDashboardModule/models/partnerKYC.model";
import { PropertyModel } from "../propertyModule/property.model";
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
      .populate("user", "fullName email profilePicture")
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

  static async updateBookingStatus(
    userId: string,
    bookingId: string,
    status: string,
  ) {
    const query = mongoose.Types.ObjectId.isValid(bookingId)
      ? { _id: bookingId, partner: userId, isDeleted: false }
      : { bookingNumber: bookingId, partner: userId, isDeleted: false };

    const booking = await BookingModel.findOneAndUpdate(
      query,
      { status, updatedAt: new Date() },
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
      .populate("user", "fullName email phone profilePicture")
      .sort({ startDate: -1 });
  }

  static async getPartnerDashboardOverview(partnerId: string) {
    const partnerIdObj = new mongoose.Types.ObjectId(partnerId);
    
    // Fetch all spaces owned by this partner (via direct assignment or property)
    const partnerProperties = await PropertyModel.find({
      partner: partnerIdObj,
      isDeleted: { $ne: true },
    }).select("_id");
    const propertyIds = partnerProperties.map((p) => p._id);

    const [voSpaces, cwSpaces, mrSpaces] = await Promise.all([
      VirtualOfficeModel.find({
        $or: [{ partner: partnerIdObj }, { property: { $in: propertyIds } }],
        isDeleted: { $ne: true },
      }, { _id: 1 }),
      CoworkingSpaceModel.find({
        $or: [{ partner: partnerIdObj }, { property: { $in: propertyIds } }],
        isDeleted: { $ne: true },
      }, { _id: 1 }),
      MeetingRoomModel.find({
        $or: [{ partner: partnerIdObj }, { property: { $in: propertyIds } }],
        isDeleted: { $ne: true },
      }, { _id: 1 }),
    ]);

    const allSpaceIds = [
      ...voSpaces.map(s => s._id),
      ...cwSpaces.map(s => s._id),
      ...mrSpaces.map(s => s._id),
    ];

    const partnerBookings = await BookingModel.find({
      $or: [
        { partner: partnerIdObj },
        { spaceId: { $in: allSpaceIds } }
      ],
      isDeleted: false,
    }).populate("user", "fullName email phone company profilePicture");

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
    const partnerIdObj = new mongoose.Types.ObjectId(partnerId);

    // Fetch all properties owned by this partner
    const partnerProperties = await PropertyModel.find({
      partner: partnerIdObj,
      isDeleted: { $ne: true },
    }).select("_id");
    const propertyIds = partnerProperties.map((p) => p._id);

    // 1. Fetch all spaces belonging to this partner (either directly or via property)
    const [voSpaces, cwSpaces, mrSpaces] = await Promise.all([
      VirtualOfficeModel.find({
        $or: [{ partner: partnerIdObj }, { property: { $in: propertyIds } }],
        isDeleted: { $ne: true },
      }, { _id: 1, name: 1 }),
      CoworkingSpaceModel.find({
        $or: [{ partner: partnerIdObj }, { property: { $in: propertyIds } }],
        isDeleted: { $ne: true },
      }, { _id: 1, name: 1 }),
      MeetingRoomModel.find({
        $or: [{ partner: partnerIdObj }, { property: { $in: propertyIds } }],
        isDeleted: { $ne: true },
      }, { _id: 1, name: 1 }),
    ]);

    const voIds = voSpaces.map(s => s._id.toString());
    const cwIds = cwSpaces.map(s => s._id.toString());
    const mrIds = mrSpaces.map(s => s._id.toString());
    const allSpaceIds = [...voIds, ...cwIds, ...mrIds];

    // 2. Fetch all regular bookings for this partner
    const partnerBookings = await BookingModel.find({
      $or: [
        { partner: partnerIdObj },
        { spaceId: { $in: allSpaceIds } }
      ],
      isDeleted: false,
    });

    // 3. Fetch all seat bookings for partner spaces
    const seatBookings = await SeatBookingModel.find({
      space: { $in: cwIds },
      status: "confirmed"
    }).populate('space', 'name');

    // 4. Fetch ALL completed payments for partner spaces
    // This is the source of truth for REVENUE
    const allPayments = await PaymentModel.find({
      space: { $in: allSpaceIds },
      status: PaymentStatus.COMPLETED,
      isDeleted: { $ne: true }
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let totalBookings = partnerBookings.length + seatBookings.length;
    let cancelledBookings = partnerBookings.filter(b => b.status === "cancelled").length + 
                         seatBookings.filter(sb => sb.status === "cancelled").length;
    let pendingRequests = partnerBookings.filter(b => ["pending", "pending_payment", "pending_kyc"].includes(b.status || "")).length;
    
    const activeClientsSet = new Set();
    partnerBookings.forEach(b => {
      if (b.status === "active" && b.user) activeClientsSet.add(b.user.toString());
    });
    seatBookings.forEach(sb => {
      if (sb.status === "confirmed" && sb.user) activeClientsSet.add(sb.user.toString());
    });

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

    // Process Payments for Revenue and Trend
    allPayments.forEach((p: any) => {
      const revenue = p.amount || p.totalAmount || 0;
      const paymentDate = new Date(p.createdAt);
      const monthLabel = paymentDate.toLocaleString("default", { month: "short" });
      
      if (paymentDate >= currentMonthStart) {
        revenueThisMonth += revenue;
      } else if (paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd) {
        revenueLastMonth += revenue;
      }

      if (trendData[monthLabel] !== undefined) {
        trendData[monthLabel] += revenue;
      }

      // Add to space division (revenue only)
      const spaceName = p.spaceName || "Unknown Space";
      if (!spaceData[spaceName]) spaceData[spaceName] = { bookings: 0, revenue: 0 };
      spaceData[spaceName].revenue += revenue;

      // Add to plan division (revenue only)
      const planName = p.planName || "Standard Plan";
      if (!planData[planName]) planData[planName] = { bookings: 0, revenue: 0 };
      planData[planName].revenue += revenue;

      // Ensure user is in active clients set if payment completed recently
      if (p.user) activeClientsSet.add(p.user.toString());
    });

    // Process Bookings for Counts and Divisions
    partnerBookings.forEach((b: any) => {
      const planName = b.plan?.name || "Standard Plan";
      const spaceName = b.spaceSnapshot?.name || "Unknown Space";
      
      if (!planData[planName]) planData[planName] = { bookings: 0, revenue: 0 };
      planData[planName].bookings++;

      if (!spaceData[spaceName]) spaceData[spaceName] = { bookings: 0, revenue: 0 };
      spaceData[spaceName].bookings++;
    });

    seatBookings.forEach((sb: any) => {
      const planName = "Seat Booking";
      const spaceName = (sb.space as any)?.name || "Coworking Space";

      if (!planData[planName]) planData[planName] = { bookings: 0, revenue: 0 };
      planData[planName].bookings++;

      if (!spaceData[spaceName]) spaceData[spaceName] = { bookings: 0, revenue: 0 };
      spaceData[spaceName].bookings++;
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

  static async getPartnerPropertyAnalytics(partnerId: string, propertyId: string) {
    const partnerIdObj = new mongoose.Types.ObjectId(partnerId);
    const propertyIdObj = new mongoose.Types.ObjectId(propertyId);

    // 1. Fetch all spaces belonging to this property
    const [voSpaces, cwSpaces, mrSpaces] = await Promise.all([
      VirtualOfficeModel.find({ property: propertyIdObj }, { _id: 1, name: 1 }),
      CoworkingSpaceModel.find({ property: propertyIdObj }, { _id: 1, name: 1 }),
      MeetingRoomModel.find({ property: propertyIdObj }, { _id: 1, name: 1 }),
    ]);

    const voIds = voSpaces.map(s => s._id.toString());
    const cwIds = cwSpaces.map(s => s._id.toString());
    const mrIds = mrSpaces.map(s => s._id.toString());
    const allSpaceIds = [...voIds, ...cwIds, ...mrIds];

    // 2. Fetch all regular bookings for these spaces
    const bookings = await BookingModel.find({
      spaceId: { $in: allSpaceIds },
      isDeleted: false,
    });

    // 3. Fetch all seat bookings for these spaces
    const seatBookings = await SeatBookingModel.find({
      space: { $in: cwIds },
      status: "confirmed"
    });

    // 4. Fetch ALL completed payments for these spaces
    // Primary source for monthly revenue
    const allPayments = await PaymentModel.find({
      space: { $in: allSpaceIds },
      status: PaymentStatus.COMPLETED,
      isDeleted: { $ne: true }
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalBookings = bookings.length + seatBookings.length;
    let revenueTotal = 0;
    const activeClientsSet = new Set();
    let totalRating = 0;
    let ratingCount = 0;

    // Process Payments for Revenue
    allPayments.forEach((p: any) => {
      const revenue = p.amount || p.totalAmount || 0;
      const paymentDate = new Date(p.createdAt);
      
      if (paymentDate >= currentMonthStart) {
        revenueTotal += revenue;
      }
      
      if (p.user) activeClientsSet.add(p.user.toString());
    });

    // Process Bookings for Status and Rating
    bookings.forEach((b: any) => {
      if (b.status === "active" && b.user) {
        activeClientsSet.add(b.user.toString());
      }
      if (b.rating) {
        totalRating += b.rating;
        ratingCount++;
      }
    });

    seatBookings.forEach((sb: any) => {
      if (sb.status === "confirmed" && sb.user) {
        activeClientsSet.add(sb.user.toString());
      }
    });

    return {
      monthlyBookings: totalBookings,
      monthlyRevenue: revenueTotal,
      newClients: activeClientsSet.size,
      avgRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : "4.8" // Fallback to 4.8 as seen in static UI if no ratings
    };
  }

  private static normalizeReviewStatus(status?: string, fallback: "pending" | "approved" | "rejected" = "pending") {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "approved" || normalized === "rejected" || normalized === "pending") return normalized;
    if (normalized === "available" || normalized === "active" || normalized === "verified") return "approved";
    return fallback;
  }

  static async syncBookingDocuments(bookingId: string) {
    const booking: any = await BookingModel.findById(bookingId).populate("user");
    if (!booking) return null;

    const userId = booking.user?._id || booking.user || booking.clientId;
    if (!userId) return null;

    let record = await BookingDocumentRecordModel.findOne({ bookingId: booking._id });
    if (!record) {
      record = new BookingDocumentRecordModel({
        bookingId: booking._id,
        userId,
        documents: [],
      });
    }

    const existingByKey = new Map<string, any>();
    const pushedKeys = new Set<string>();
    (record.documents || []).forEach((doc: any) => {
      const key = `${doc.category}:${doc.profileId || ""}:${doc.id || ""}:${doc.type}:${doc.url}`;
      existingByKey.set(key, doc);
    });

    const nextDocs: any[] = [];
    const pushDoc = (doc: any) => {
      const key = `${doc.category}:${doc.profileId || ""}:${doc.id || ""}:${doc.type}:${doc.url}`;
      if (pushedKeys.has(key)) return;
      pushedKeys.add(key);
      const existing = existingByKey.get(key);
      nextDocs.push({
        ...doc,
        adminStatus: BookingService.normalizeReviewStatus(doc.adminStatus),
        partnerStatus: BookingService.normalizeReviewStatus(doc.partnerStatus),
        partnerRejectionReason: doc.partnerRejectionReason || existing?.partnerRejectionReason,
        partnerReviewedAt: doc.partnerReviewedAt || existing?.partnerReviewedAt,
        partnerReviewedBy: doc.partnerReviewedBy || existing?.partnerReviewedBy,
      });
    };

    (booking.documents || [])
      .filter((doc: any) => doc.fileUrl || doc.url)
      .filter((doc: any) => !String(doc.type || "").startsWith("__kyc_partner_review__"))
      .forEach((doc: any) => {
        pushDoc({
          id: String(doc._id || ""),
          name: doc.name || doc.type || "Booking Document",
          type: doc.type || "document",
          url: doc.fileUrl || doc.url,
          category: "booking_specific",
          profileId: String(booking._id),
          adminStatus: doc.status,
          partnerStatus: doc.partnerReviewStatus,
          uploadedBy: doc.uploadedBy || "system",
        });
      });

    const addProfileDocs = (profile: any, category: string) => {
      if (!profile?.documents?.length) return;
      profile.documents
        .filter((doc: any) => doc.fileUrl || doc.url)
        .filter((doc: any) => doc.type !== "address_proof")
        .forEach((doc: any) => {
          pushDoc({
            id: String(doc._id || ""),
            name: doc.name || doc.type || "KYC Document",
            type: doc.type || "document",
            url: doc.fileUrl || doc.url,
            category,
            profileId: String(profile._id),
            adminStatus: doc.status,
            partnerStatus: doc.partnerReviewStatus || "pending",
            partnerRejectionReason: doc.partnerRejectionReason,
            partnerReviewedAt: doc.partnerReviewedAt,
            partnerReviewedBy: doc.partnerReviewedBy,
            uploadedBy: "user",
          });
        });
    };

    const bookingUserId = String(booking.user?._id || booking.user || "");
    if (bookingUserId) {
      const individual = await KYCDocumentModel.findOne({
        user: bookingUserId,
        kycType: "individual",
        isDeleted: { $ne: true },
      }).lean();
      addProfileDocs(individual, "user_kyc");
    }

    if (booking.kycProfile) {
      const [businessById, businessByKyc, kycProfile] = await Promise.all([
        BusinessInfoModel.findById(booking.kycProfile).lean(),
        BusinessInfoModel.findOne({ kycProfile: booking.kycProfile, isDeleted: { $ne: true } }).lean(),
        KYCDocumentModel.findById(booking.kycProfile).lean(),
      ]);
      addProfileDocs(businessById || businessByKyc || (kycProfile?.kycType === "business" ? kycProfile : null), "business_kyc");
    }

    if (booking.selectedPartners?.length) {
      const partnerProfiles = await PartnerKYCModel.find({
        _id: { $in: booking.selectedPartners },
        isDeleted: { $ne: true },
      }).lean();
      partnerProfiles.forEach((partner) => addProfileDocs(partner, "partner_kyc"));
    }

    record.documents = nextDocs as any;
    // Refined status calculation: only consider relevant documents for the partner.
    // We exclude 'address_proof' and only count mandatory KYC or documents the partner has actually reviewed.
    const partnerRelevantDocs = nextDocs.filter((doc) => {
      if (doc.type === "address_proof") return false;
      if (doc.category === "booking_specific") return true;
      if (doc.partnerStatus !== "pending") return true;
      
      const mandatoryKycTypes = ["pan_card", "aadhaar", "gst_certificate", "coi", "video_kyc"];
      return mandatoryKycTypes.includes(doc.type);
    });

    record.overallPartnerStatus =
      partnerRelevantDocs.length > 0 && partnerRelevantDocs.every((doc) => doc.partnerStatus === "approved")
        ? "approved"
        : partnerRelevantDocs.some((doc) => doc.partnerStatus === "rejected")
          ? "rejected"
          : "pending";

    record.overallAdminStatus =
      nextDocs.length > 0 && nextDocs.every((doc) => doc.adminStatus === "approved")
        ? "approved"
        : nextDocs.some((doc) => doc.adminStatus === "rejected")
          ? "rejected"
          : "pending";

    await record.save();

    // Sync back to BookingModel if overall status is approved
    if (record.overallPartnerStatus === "approved") {
      await BookingModel.updateOne(
        { _id: booking._id, status: { $in: ["pending", "pending_kyc"] } },
        { $set: { status: "active", partnerKycStatus: "approved" } }
      );
    } else if (record.overallPartnerStatus === "rejected") {
      await BookingModel.updateOne(
        { _id: booking._id, status: { $in: ["pending", "pending_kyc"] } },
        { $set: { partnerKycStatus: "rejected" } }
      );
    }

    return record;
  }
}
