import { Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { BookingModel } from "../../bookingModule/booking.model";
import { BookingService } from "../../bookingModule/booking.service";
import { KYCDocumentModel, KYCDocumentItem } from "../models/kyc.model";
import { InvoiceModel } from "../../invoiceModule/invoice.model";
import { SupportTicketModel } from "../models/supportTicket.model";
import { UserModel } from "../../authModule/models/user.model";
import Mail from "../../mailModule/models/mail.model";
import Visit from "../../visitModule/models/visit.model";
import { TicketModel, TicketStatus } from "../../ticketModule/models/Ticket";
import {
  CreditLedgerModel,
  CreditType,
} from "../../creditLedgerModule/creditLedger.model";
import { getFileUrl as getMulterFileUrl } from "../config/multer.config";
import { BusinessInfoModel } from "../models/businessInfo.model";
import { NotificationService } from "../../notificationModule/services/notification.service";
import { NotificationType } from "../../notificationModule/models/Notification";
import {
  getCreditsSchema,
  redeemRewardSchema,
} from "../userDashboard.validation";
import { PropertyModel } from "../../propertyModule/property.model";
import { CoworkingSpaceModel } from "../../coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../../virtualOfficeModule/virtualOffice.model";
import { MeetingRoomModel } from "../../meetingRoomModule/meetingRoom.model";
import { SeatBookingModel } from "../../seatingModule/seating.model";
import { PaymentModel, PaymentType } from "../../paymentModule/payment.model";
import { MeetingModel, MeetingStatus } from "../../meetingSchedulerModule/meeting.model";
import { MeetingSchedulerService } from "../../meetingSchedulerModule/meetingScheduler.service";

// ============ DASHBOARD ============

export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get active bookings count from both models
    const [activeBookingsMain, activeSeatBookings] = await Promise.all([
      BookingModel.countDocuments({
        user: userId,
        status: "active",
        isDeleted: false,
      }),
      SeatBookingModel.countDocuments({
        user: userId,
        status: "confirmed",
      }),
    ]);

    const activeBookings = activeBookingsMain + activeSeatBookings;

    // Get pending invoices total
    const pendingInvoices = await InvoiceModel.aggregate([
      { $match: { user: userId, status: "pending", isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    // Get next booking (upcoming expiry) from both models
    const [nextBookingMain, nextSeatBooking] = await Promise.all([
      BookingModel.findOne({
        user: userId,
        status: "active",
        isDeleted: false,
      })
        .sort({ endDate: 1 })
        .select("endDate"),
      SeatBookingModel.findOne({
        user: userId,
        status: "confirmed",
      })
        .sort({ endTime: 1 })
        .select("endTime"),
    ]);

    let nextBookingDate = nextBookingMain?.endDate || null;
    if (nextSeatBooking?.endTime) {
      if (
        !nextBookingDate ||
        nextSeatBooking.endTime.getTime() < nextBookingDate.getTime()
      ) {
        nextBookingDate = nextSeatBooking.endTime;
      }
    }

    // Get KYC status
    const kyc = await KYCDocumentModel.findOne({ user: userId });

    // Get recent activity (last 5 bookings/invoices) from both models
    const [recentBookingsMain, recentSeatBookings] = await Promise.all([
      BookingModel.find({
        user: userId,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("bookingNumber status createdAt spaceSnapshot.name"),
      SeatBookingModel.find({
        user: userId,
      })
        .populate("space")
        .sort({ createdAt: -1 })
        .limit(3),
    ]);

    const recentActivityMain = recentBookingsMain.map((b) => ({
      type: "booking",
      message: `${b.spaceSnapshot?.name || "Booking"} - ${b.status}`,
      date: b.createdAt,
    }));

    const recentActivitySeats = recentSeatBookings.map((s: any) => {
      const seat = s.toObject() as any;
      return {
        type: "booking",
        message: `${seat.space?.name || "Seat Booking"} - ${seat.status === "confirmed" ? "active" : seat.status}`,
        date: seat.createdAt,
      };
    });

    const recentActivity = [...recentActivityMain, ...recentActivitySeats]
      .sort((a: any, b: any) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    // Usage breakdown
    const usageBreakdownMain = await BookingModel.aggregate([
      { $match: { user: userId, isDeleted: false } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const usageBreakdownSeats = await SeatBookingModel.countDocuments({
      user: userId,
    });

    const totalBookingsMain = usageBreakdownMain.reduce(
      (sum, u) => sum + u.count,
      0,
    );
    const totalBookings = totalBookingsMain + usageBreakdownSeats;

    const virtualOfficeCount =
      usageBreakdownMain.find((u) => u._id === "VirtualOffice")?.count || 0;
    const coworkingCount =
      (usageBreakdownMain.find((u) => u._id === "CoworkingSpace")?.count || 0) +
      usageBreakdownSeats;
    const meetingRoomCount =
      usageBreakdownMain.find((u) => u._id === "MeetingRoom")?.count || 0;

    // Monthly bookings (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [monthlyBookingsMain, monthlyBookingsSeats] = await Promise.all([
      BookingModel.aggregate([
        {
          $match: {
            user: userId,
            createdAt: { $gte: sixMonthsAgo },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 },
          },
        },
      ]),
      SeatBookingModel.aggregate([
        {
          $match: {
            user: userId,
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const combinedMonthly = new Map();
    [...monthlyBookingsMain, ...monthlyBookingsSeats].forEach((m) => {
      combinedMonthly.set(m._id, (combinedMonthly.get(m._id) || 0) + m.count);
    });

    const monthlyData = Array.from(combinedMonthly.entries())
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => a._id - b._id);

    const months = [
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
    const formattedMonthly = monthlyData.map((m) => ({
      month: months[m._id - 1],
      count: m.count,
    }));

    res.status(200).json({
      success: true,
      data: {
        activeServices: activeBookings,
        pendingInvoices: pendingInvoices[0]?.total || 0,
        nextBookingDate: nextBookingDate,
        kycStatus: kyc?.overallStatus || "not_started",
        recentActivity,
        usageBreakdown: {
          virtualOffice:
            totalBookings > 0
              ? Math.round((virtualOfficeCount / totalBookings) * 100)
              : 0,
          coworkingSpace:
            totalBookings > 0
              ? Math.round((coworkingCount / totalBookings) * 100)
              : 0,
          meetingRoom:
            totalBookings > 0
              ? Math.round((meetingRoomCount / totalBookings) * 100)
              : 0,
        },
        monthlyBookings: formattedMonthly,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch dashboard data" });
  }
};

// ============ PARTNER BOOKINGS ============

import { PartnerKYCModel } from "../models/partnerKYC.model";

export const getAllPartnerSpaces = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    console.log(`[DEBUG] getAllPartnerSpaces called for userId: ${userId}`);

    // Fetch properties where partner matches userId
    // Explicitly cast to ObjectId just in case
    const partnerId = new mongoose.Types.ObjectId(userId);
    console.log(`[DEBUG] Searching for properties with partner: ${partnerId}`);

    const properties = await PropertyModel.find({
      partner: partnerId,
      isDeleted: false,
    });

    console.log(
      `[DEBUG] Found ${properties.length} properties for partner: ${userId}`,
    );

    const spaces = properties
      .map((p: any) => {
        try {
          const pObj = typeof p.toObject === "function" ? p.toObject() : p;
          const _id = String(pObj._id || pObj.id || "");
          return {
            ...pObj, // Spread all fields
            _id,
            id: _id,
            name: pObj.name || "N/A",
            city: pObj.city || "N/A",
            area: pObj.area || "N/A",
            location: pObj.area || "N/A",
            status: pObj.isActive ? "ACTIVE" : "INACTIVE",
            type: "Property",
            kycStatus: pObj.kycStatus || "not_started",
            propertyStatus: pObj.status || "draft",
            image: pObj.images?.[0] || pObj.image || "",
          };
        } catch (err) {
          console.error("Mapping error for property:", p._id, err);
          return null;
        }
      })
      .filter(Boolean);

    console.log(`Successfully mapped ${spaces.length} spaces for response`);
    if (spaces.length > 0) {
      console.log("First space example:", JSON.stringify(spaces[0], null, 2));
    }

    return res.status(200).json({
      success: true,
      data: spaces,
    });
  } catch (error) {
    console.error("Failed to fetch all partner properties:", error);
    res.status(500).json({ success: false, message: "Failed to fetch spaces" });
  }
};

export const getPartnerActiveRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const partnerId = new mongoose.Types.ObjectId(userId);
    const bookings = await BookingModel.find({
      partner: partnerId,
      isDeleted: false,
      status: { $in: ["pending_payment", "pending_kyc"] },
    }).populate("user", "fullName email phoneNumber");

    const userIds = [
      ...new Set(bookings.map((b: any) => b.user?._id || b.user)),
    ];
    const businessInfos = await BusinessInfoModel.find({
      user: { $in: userIds },
      isDeleted: false,
    });
    const businessMap = new Map(
      businessInfos.map((info) => [info.user.toString(), info]),
    );

    const [meetings, visits] = await Promise.all([
      MeetingModel.find({
        partner: partnerId,
        status: "scheduled",
      }),
      Visit.find({
        partnerId: partnerId,
        status: "Pending"
      })
    ]);

    // Find real users for meeting/visit emails to link chat correctly
    const meetingEmails = meetings.map(m => m.bookingUserEmail);
    const visitEmails = visits.map(v => v.email);
    const allEmails = [...new Set([...meetingEmails, ...visitEmails])];
    
    const leadUsers = await UserModel.find({ email: { $in: allEmails } }).select("_id email").lean();
    const userEmailMap = new Map(leadUsers.map(u => [u.email, u._id.toString()]));

    // 4. Find Support Tickets (Queries) linked to these bookings or partner directly
    const partnerBookingIds = await BookingModel.find({
      partner: partnerId,
      isDeleted: false,
    }).distinct("_id");

    const supportTickets = await TicketModel.find({
      $or: [
        { bookingId: { $in: partnerBookingIds } },
        { partnerId: partnerId }
      ],
      status: { $in: ["open", "in_progress"] },
    }).populate("user", "fullName email phoneNumber")
      .populate("bookingId", "spaceSnapshot")
      .lean();

    const combinedRequests = [
      ...bookings.map((b: any) => {
        const name = b.user?.fullName || "Unknown";
        const initials =
          name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase() || "UN";

        const business = businessMap.get(b.user?._id?.toString() || b.user?.toString());

        return {
          id: b.bookingNumber || b._id.toString(),
          user: {
            id: b.user?._id?.toString() || b.user?.toString(),
            name,
            email: b.user?.email || "Unknown",
            phone: b.user?.phoneNumber || "N/A",
            avatar: initials,
            company: business?.companyName || "N/A",
          },
          space: b.spaceSnapshot?.name || "Unknown Space",
          type: b.type,
          date: b.createdAt
            ? new Date(b.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
            : "Unknown",
          kycStatus: b.kycStatus || "pending",
          status: b.status,
          category: "Booking"
        };
      }),
      ...meetings.map((m: any) => {
        const name = m.bookingUserName || "Unknown";
        const initials =
          name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase() || "UN";
        return {
          id: m._id.toString(),
          user: {
            id: userEmailMap.get(m.bookingUserEmail) || m._id.toString(), // Use user ID if exists, otherwise request ID
            name: m.bookingUserName,
            email: m.bookingUserEmail,
            phone: m.bookingUserPhone,
            avatar: initials,
            company: "N/A",
          },
          space: m.notes ? m.notes.split(" - ")[0] : "General Inquiry",
          type: "Meeting",
          date: m.createdAt
            ? new Date(m.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
            : "Unknown",
          kycStatus: "approved",
          status: m.status,
          category: "Meeting"
        };
      }),
      ...visits.map((v: any) => {
        const name = v.visitor || "Unknown";
        const initials =
          name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase() || "UN";
        return {
          id: v._id.toString(),
          user: {
            id: userEmailMap.get(v.email) || v._id.toString(), // Use user ID if exists, otherwise request ID
            name: v.visitor,
            email: v.email,
            phone: "N/A",
            avatar: initials,
            company: "N/A",
          },
          space: v.space || "Space Visit",
          type: "Visit",
          date: v.date
            ? new Date(v.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
            : "Unknown",
          kycStatus: "approved",
          status: v.status,
          category: "Visit"
        };
      }),
      ...supportTickets.map((t: any) => {
        const name = t.user?.fullName || "Unknown";
        const initials =
          name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase() || "UN";
        return {
          id: t._id.toString(),
          ticketNumber: t.ticketNumber,
          user: {
            id: t.user?._id?.toString() || t._id.toString(),
            name,
            email: t.user?.email || "Unknown",
            phone: t.user?.phoneNumber || "N/A",
            avatar: initials,
            company: "N/A",
          },
          space: t.bookingId?.spaceSnapshot?.name || t.subject || "Query",
          type: "Query",
          date: t.createdAt
            ? new Date(t.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
            : "Unknown",
          kycStatus: "approved",
          status: t.status,
          category: "Ticket"
        };
      })
    ];

    return res.status(200).json({
      success: true,
      data: combinedRequests,
    });
  } catch (error) {
    console.error("Failed to fetch partner active requests:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch active requests" });
  }
};

export const getPartnerDashboardOverview = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    console.log("Partner ID:", userId);
    // Get all bookings where the partner is the logged-in user
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const partnerBookings = await BookingModel.find({
      partner: userObjectId,
      isDeleted: false,
    }).populate("user", "fullName email phoneNumber company");
    console.log("Partner Bookings:", partnerBookings);
    // Map bookings to the frontend Client structure
    const clients = partnerBookings.map((b: any) => {
      // Determine Status
      let status = "INACTIVE";
      if (b.status === "active") {
        if (b.endDate) {
          const now = new Date();
          const end = new Date(b.endDate);
          const diffDays = Math.ceil(
            (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          status = diffDays <= 7 ? "EXPIRING_SOON" : "ACTIVE"; // Mark as expiring if <= 7 days left
        } else {
          status = "ACTIVE";
        }
      }

      // Determine Plan name
      let planName = b.plan?.name || "Standard";
      if (b.type === "VirtualOffice") planName = "Virtual Office " + planName;
      if (b.type === "CoworkingSpace") planName = "Coworking " + planName;

      return {
        id: b.bookingNumber || b._id.toString(),
        companyName: b.user?.company || b.user?.fullName || "N/A",
        contactName: b.user?.fullName || "N/A",
        email: b.user?.email || "N/A",
        plan: planName,
        space: b.spaceSnapshot?.name || "Unknown Space",
        startDate: b.startDate
          ? new Date(b.startDate).toISOString().split("T")[0]
          : "N/A",
        endDate: b.endDate
          ? new Date(b.endDate).toISOString().split("T")[0]
          : "N/A",
        status: status,
        kycStatus: b.kycStatus === "approved" ? "VERIFIED" : "PENDING",
      };
    });

    res.status(200).json({
      success: true,
      data: {
        clients,
      },
    });
  } catch (error) {
    console.error("Partner Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch partner dashboard data",
    });
  }
};

export const getPartnerSpaceBookings = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    const { month, year } = req.query;

    if (!spaceId || !mongoose.Types.ObjectId.isValid(spaceId as string)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid space ID" });
    }

    const userId = req.user?.id; // This is the partner requesting the data

    // SECURED: We now explicitly mandate that the booking's partner matches the logged-in user!
    // HARDENED: Using explicit ObjectId casting to ensure reliable matching
    const filter: any = {
      spaceId: new mongoose.Types.ObjectId(spaceId as string),
      partner: new mongoose.Types.ObjectId(userId), // <-- THIS PLUGS THE DATA LEAK
      isDeleted: false,
    };

    // Date Filtering
    let startDate: Date, endDate: Date;
    const now = new Date();
    const currentYear = year ? parseInt(year as string) : now.getFullYear();

    if (month) {
      const monthIndex = parseInt(month as string) - 1;
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

    const bookings = await BookingModel.find(filter)
      .populate("user", "fullName email phone")
      .sort({ startDate: -1 });

    const mappedBookings = bookings.map((b: any) => {
      const bObj = b.toObject();
      return {
        ...bObj,
        totalAmount: bObj.plan?.finalPrice || bObj.plan?.price || 0,
      };
    });

    res.status(200).json({ success: true, data: mappedBookings });
  } catch (error) {
    console.error("Get partner bookings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bookings" });
  }
};

export const getPartnerPropertyBookings = async (
  req: Request,
  res: Response,
) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user?.id;

    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId as string)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid property ID" });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 1. Find all spaces belonging to this property
    const [coworking, virtual, meeting] = await Promise.all([
      CoworkingSpaceModel.find({
        property: new mongoose.Types.ObjectId(propertyId as string),
        isDeleted: false,
      }).select("_id"),
      VirtualOfficeModel.find({
        property: new mongoose.Types.ObjectId(propertyId as string),
        isDeleted: false,
      }).select("_id"),
      MeetingRoomModel.find({
        property: new mongoose.Types.ObjectId(propertyId as string),
        isDeleted: false,
      }).select("_id"),
    ]);

    const spaceIds = [
      ...coworking.map((s) => s._id),
      ...virtual.map((s) => s._id),
      ...meeting.map((s) => s._id),
    ];

    if (spaceIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // 2. Fetch all bookings for these spaces associated with this partner
    const bookings = await BookingModel.find({
      isDeleted: false,
      spaceId: { $in: spaceIds },
    })
      .populate("user", "fullName email phone")
      .sort({ createdAt: -1 });

    const mappedBookings = bookings.map((b: any) => {
      const bObj = b.toObject();
      return {
        ...bObj,
        totalAmount: bObj.plan?.finalPrice || bObj.plan?.price || 0,
      };
    });

    res.status(200).json({ success: true, data: mappedBookings });
  } catch (error) {
    console.error("Get property bookings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch property bookings" });
  }
};

export const getPartnerClients = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    // 1. Fetch all bookings for this partner
    const bookings = await BookingModel.find({
      partner: userId,
      isDeleted: false,
    }).populate("user", "fullName email phoneNumber");

    // 2. Fetch business info for all users in these bookings to get company names
    const userIds = [
      ...new Set(bookings.map((b: any) => b.user?._id || b.user)),
    ];
    const businessInfos = await BusinessInfoModel.find({
      user: { $in: userIds },
      isDeleted: false,
    });

    // Create a map for quick lookup
    const businessMap = new Map(
      businessInfos.map((info) => [info.user.toString(), info]),
    );

    // 3. Group bookings by user and select the best representative booking
    const clientMap = new Map<string, any>();

    bookings.forEach((booking: any) => {
      const user = booking.user;
      const userIdStr = user?._id?.toString() || user?.toString();
      if (!userIdStr) return;

      const business = businessMap.get(userIdStr);

      // Determine Status for this booking
      let status = "INACTIVE";
      if (booking.status === "active") {
        const now = new Date();
        const endDate = new Date(booking.endDate);
        const diffDays = Math.ceil(
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        status = diffDays <= 30 && diffDays > 0 ? "EXPIRING_SOON" : "ACTIVE";
      }

      const clientData = {
        id: booking.bookingNumber,
        userId: userIdStr,
        companyName: business?.companyName || user?.fullName || "N/A",
        contactName: user?.fullName || "N/A",
        email: user?.email || "N/A",
        phone: user?.phoneNumber || "N/A",
        plan: booking.plan?.name || "N/A",
        space: booking.spaceSnapshot?.name || "N/A",
        startDate: booking.startDate
          ? new Date(booking.startDate).toISOString().split("T")[0]
          : "N/A",
        endDate: booking.endDate
          ? new Date(booking.endDate).toISOString().split("T")[0]
          : "N/A",
        status,
        kycStatus: booking.kycStatus === "approved" ? "VERIFIED" : "PENDING",
        dealValue: booking.plan?.finalPrice || booking.plan?.price || 0,
        createdAt: booking.createdAt,
      };

      // If user already exists in map, decide which booking to keep
      // Priority: ACTIVE > EXPIRING_SOON > INACTIVE
      const existing = clientMap.get(userIdStr);
      if (!existing) {
        clientMap.set(userIdStr, clientData);
      } else {
        const priority: Record<string, number> = {
          ACTIVE: 3,
          EXPIRING_SOON: 2,
          INACTIVE: 1,
        };
        if (priority[status] > priority[existing.status]) {
          clientMap.set(userIdStr, clientData);
        }
      }
    });

    res
      .status(200)
      .json({ success: true, data: Array.from(clientMap.values()) });
  } catch (error) {
    console.error("Get partner clients error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch clients" });
  }
};

export const getPartnerClientDetails = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params; // This is now the User ID
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 1. Find the specific booking to identify the client context
    // We prioritize active bookings for this partner
    const mainBooking = await BookingModel.findOne({
      user: clientId,
      partner: userId,
      isDeleted: false,
    })
      .sort({ status: 1, createdAt: -1 }) // Sort to get most relevant if multiple (Simplified)
      .populate("user", "fullName email phoneNumber");

    if (!mainBooking) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found for this partner" });
    }

    const clientUserId = clientId;

    // 2. Fetch all related data
    const [businessInfo, kycProfile, invoices, allUserBookings] =
      await Promise.all([
        BusinessInfoModel.findOne({ user: clientUserId, isDeleted: false }),
        KYCDocumentModel.findOne({ user: clientUserId }),
        InvoiceModel.find({ user: clientUserId, isDeleted: false }).sort({
          createdAt: -1,
        }),
        BookingModel.find({
          user: clientUserId,
          partner: userId,
          isDeleted: false,
        }).sort({ startDate: -1 }),
      ]);

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // 3. Resolve Agreement from Documents
    const agreementDoc = (mainBooking.documents || []).find(
      (doc: any) =>
        doc.type?.toLowerCase().includes("agreement") ||
        doc.name?.toLowerCase().includes("agreement"),
    );

    const agreementUrl =
      agreementDoc?.url && agreementDoc.url !== "#"
        ? agreementDoc.url.startsWith("http")
          ? agreementDoc.url
          : `${baseUrl}${agreementDoc.url.startsWith("/") ? "" : "/"}${agreementDoc.url}`
        : "#";

    // 4. Map to frontend ClientDetails format
    const details = {
      id: mainBooking.bookingNumber,
      companyName:
        businessInfo?.companyName ||
        (mainBooking.user as any)?.fullName ||
        "N/A",
      contactName: (mainBooking.user as any)?.fullName || "N/A",
      email: (mainBooking.user as any)?.email || "N/A",
      phone: (mainBooking.user as any)?.phoneNumber || "N/A",
      plan: mainBooking.plan?.name || "N/A",
      space: mainBooking.spaceSnapshot?.name || "N/A",
      startDate: mainBooking.startDate
        ? new Date(mainBooking.startDate).toISOString().split("T")[0]
        : "N/A",
      endDate: mainBooking.endDate
        ? new Date(mainBooking.endDate).toISOString().split("T")[0]
        : "N/A",
      status: mainBooking.status.toUpperCase(),
      kyc: {
        status:
          kycProfile?.overallStatus === "approved"
            ? "VERIFIED"
            : kycProfile?.overallStatus === "rejected"
              ? "REJECTED"
              : "PENDING",
        documents: (kycProfile?.documents || []).map(
          (doc: any, index: number) => ({
            id: `DOC-${index}`,
            type: doc.type,
            fileUrl:
              doc.fileUrl && doc.fileUrl !== "#"
                ? doc.fileUrl.startsWith("http")
                  ? doc.fileUrl
                  : `${baseUrl}${doc.fileUrl.startsWith("/") ? "" : "/"}${doc.fileUrl}`
                : "#",
            uploadedAt: doc.uploadedAt
              ? new Date(doc.uploadedAt).toISOString().split("T")[0]
              : "N/A",
          }),
        ),
      },
      agreement: {
        status: agreementDoc ? "SIGNED" : "PENDING",
        agreementUrl,
        signedAt: agreementDoc?.generatedAt
          ? new Date(agreementDoc.generatedAt).toISOString().split("T")[0]
          : mainBooking.startDate
            ? new Date(mainBooking.startDate).toISOString().split("T")[0]
            : "N/A",
        validTill: mainBooking.endDate
          ? new Date(mainBooking.endDate).toISOString().split("T")[0]
          : "N/A",
      },
      bookings: allUserBookings.map((b) => ({
        id: b.bookingNumber,
        date: b.startDate
          ? new Date(b.startDate).toISOString().split("T")[0]
          : "N/A",
        slot: "Full Access",
        status: b.status.toUpperCase(),
        amount: b.plan?.price || 0,
      })),
      invoices: invoices.map((inv) => ({
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.total,
        status: (inv.status || "pending").toUpperCase(),
        pdfUrl: inv.pdfUrl || "#",
        createdAt: inv.createdAt
          ? new Date(inv.createdAt).toISOString().split("T")[0]
          : "N/A",
      })),
    };

    res.status(200).json({ success: true, data: details });
  } catch (error) {
    console.error("Get partner client details error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch client details" });
  }
};

export const getPartnerSpaceBookingAnalytics = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const analytics = await BookingService.getPartnerSpaceBookingAnalytics(
      userId as string,
    );

    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    console.error("Partner Analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch booking analytics",
    });
  }
};

export const getPartnerPropertyAnalytics = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const { propertyId } = req.params;

    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId as string)) {
      return res.status(400).json({ success: false, message: "Invalid property ID" });
    }

    const analytics = await BookingService.getPartnerPropertyAnalytics(
      userId as string,
      propertyId as string
    );

    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    console.error("Partner Property Analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch property analytics",
    });
  }
};

export const convertPartnerRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const requestId = req.params.requestId as string;
    const { category } = req.body;

    if (!requestId || !category) {
      return res.status(400).json({ success: false, message: "Request ID and category are required" });
    }

    // For non-booking categories, requestId must be a valid ObjectId
    if (category !== "Booking" && !mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ success: false, message: "Invalid Request ID format" });
    }

    const partnerObjectId = new mongoose.Types.ObjectId(userId);

    let updated;
    if (category === "Booking") {
      const query = mongoose.Types.ObjectId.isValid(requestId as string)
        ? { $or: [{ _id: requestId }, { bookingNumber: requestId }], partner: partnerObjectId, isDeleted: false }
        : { bookingNumber: requestId, partner: partnerObjectId, isDeleted: false };

      const booking = await BookingModel.findOne(query);
      if (booking) {
        booking.status = "active";
        booking.kycStatus = "approved";
        
        if (!booking.startDate) booking.startDate = new Date();
        if (!booking.endDate) {
          const endDate = new Date(booking.startDate);
          endDate.setMonth(endDate.getMonth() + (booking.plan?.tenure || 12));
          booking.endDate = endDate;
        }
        
        booking.updatedAt = new Date();
        await booking.save();
        updated = booking;
      }
    } else if (category === "Meeting") {
      updated = await MeetingModel.findOneAndUpdate(
        { _id: requestId, partner: partnerObjectId },
        { status: MeetingStatus.Completed },
        { new: true }
      );
    } else if (category === "Visit") {
      updated = await Visit.findOneAndUpdate(
        { _id: requestId, partnerId: partnerObjectId },
        { status: "Completed" },
        { new: true }
      );
    } else if (category === "Ticket") {
      // Find tickets by ID and either partnerId match OR linked to one of partner's bookings
      const partnerBookingIds = await BookingModel.find({
        partner: partnerObjectId,
        isDeleted: false
      }).distinct("_id");

      updated = await TicketModel.findOneAndUpdate(
        {
          _id: requestId,
          $or: [
            { partnerId: partnerObjectId },
            { bookingId: { $in: partnerBookingIds } }
          ]
        },
        { status: TicketStatus.RESOLVED },
        { new: true }
      );
    } else {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }

    if (!updated) {
      console.log(`[convertPartnerRequest] 404: Not found or unauthorized. ID: ${requestId}, Category: ${category}, Partner: ${userId}`);
      return res.status(404).json({ success: false, message: "Request not found or not authorized" });
    }

    // Resolve any active chat tickets for this enquiry
    if (category !== "Ticket") {
      try {
        const ticketQuery: any = {
          partnerId: partnerObjectId,
          status: { $in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] }
        };

      if (category === "Booking") {
        ticketQuery.$or = [
          { bookingId: updated._id },
          { bookingId: (updated as any).bookingNumber }
        ];
      } else {
        // For Meetings and Visits, the inquiry ID is stored in bookingId field
        ticketQuery.bookingId = requestId;
      }

      await TicketModel.updateMany(
        ticketQuery,
        { 
          status: TicketStatus.RESOLVED,
          updatedAt: new Date()
        }
      );
      } catch (ticketError) {
        console.error("[convertPartnerRequest] Failed to resolve tickets:", ticketError);
        // Don't fail the whole request if ticket resolution fails
      }
    }

    res.status(200).json({
      success: true,
      message: `${category} marked as converted successfully`,
      data: updated
    });
  } catch (error) {
    console.error("Convert Request error:", error);
    res.status(500).json({ success: false, message: "Failed to convert request" });
  }
};

// ============ BOOKINGS ============

export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type, status, page = 1, limit = 100 } = req.query;

    let normalizedType = type as string;
    if (type === "virtual_office") normalizedType = "VirtualOffice";
    else if (type === "coworking_space") normalizedType = "CoworkingSpace";
    else if (type === "meeting_room") normalizedType = "MeetingRoom";

    const filter: any = { user: userId, isDeleted: { $ne: true } };
    if (normalizedType) filter.type = normalizedType;
    if (status) filter.status = status;

    const limitNum = Number(limit) || 100;
    const skip = (Number(page) - 1) * limitNum;

    // 0. AUTO-FIX: Transition pending_kyc to active if user is already verified
    try {
      const user = await UserModel.findById(userId);
      if (user?.kycVerified) {
        // Find bookings that need activation
        const needsActivation = await BookingModel.find({
          user: userId,
          status: "pending_kyc",
          isDeleted: { $ne: true }
        });

        if (needsActivation.length > 0) {
          await BookingModel.updateMany(
            { user: userId, status: "pending_kyc", isDeleted: { $ne: true } },
            { 
              $set: { 
                status: "active", 
                kycStatus: "approved",
                updatedAt: new Date()
              },
              $push: {
                timeline: {
                  status: "activated_automatically",
                  date: new Date(),
                  note: "Booking activated automatically as user KYC is already verified.",
                  by: "System"
                }
              }
            }
          );
        }
      }
    } catch (err) {
      console.error("[getAllBookings] Auto-activation error:", err);
    }

    // Prepare seat filter if applicable
    let seatFilter: any = null;
    if (!normalizedType || normalizedType === "CoworkingSpace") {
      seatFilter = { user: userId };
      if (status) {
        if (status === "active") seatFilter.status = "confirmed";
        else if (status === "pending_payment") seatFilter.status = "pending";
        else seatFilter.status = status;
      }
    }

    // Completed payments with missing bookings (legacy failure recovery)
    let paymentTypeFilter: string | undefined;
    if (normalizedType === "VirtualOffice") paymentTypeFilter = PaymentType.VIRTUAL_OFFICE;
    else if (normalizedType === "CoworkingSpace") paymentTypeFilter = PaymentType.COWORKING_SPACE;
    else if (normalizedType === "MeetingRoom") paymentTypeFilter = PaymentType.MEETING_ROOM;

    const shouldIncludePaymentFallback =
      !status || status === "pending_kyc" || status === "active";

    const paymentFallbackQuery: any = {
      user: userId,
      status: "completed",
      isDeleted: { $ne: true },
      paymentType: { $ne: PaymentType.SEAT_BOOKING },
    };

    if (paymentTypeFilter) {
      paymentFallbackQuery.paymentType = paymentTypeFilter;
    }

    // 1. Fetch data and counts
    const [
      bookingsRaw,
      totalBookingsMain,
      seatBookingsRaw,
      totalSeatBookingsCount,
      completedPaymentsRaw,
    ] = await Promise.all([
      BookingModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      BookingModel.countDocuments(filter),
      seatFilter
        ? SeatBookingModel.find(seatFilter)
          .populate("space")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
        : Promise.resolve([]),
      seatFilter
        ? SeatBookingModel.countDocuments(seatFilter)
        : Promise.resolve(0),
      shouldIncludePaymentFallback
        ? PaymentModel.find(paymentFallbackQuery)
          .sort({ createdAt: -1 })
          .limit(limitNum)
        : Promise.resolve([]),
    ]);

    // 2. Normalize seat bookings
    const normalizedSeatBookings = (seatBookingsRaw as any[]).map((s) => {
      const seatBooking = s.toObject() as any;
      const space = seatBooking.space || {};

      return {
        _id: seatBooking._id,
        bookingNumber: seatBooking.paymentId
          ? `SB-${seatBooking.paymentId.slice(-6).toUpperCase()}`
          : `SB-${seatBooking._id.toString().slice(-6).toUpperCase()}`,
        type: "CoworkingSpace",
        spaceId: space._id || seatBooking.space,
        user: seatBooking.user,
        spaceSnapshot: {
          _id: space._id,
          name: space.name,
          address: space.address,
          city: space.city,
          image: space.images?.[0] || "",
        },
        plan: {
          name: "Seat Booking",
          price: seatBooking.totalAmount,
          tenure: 1,
          tenureUnit: "booking",
        },
        status:
          seatBooking.status === "confirmed"
            ? "active"
            : seatBooking.status === "pending"
              ? "pending_payment"
              : seatBooking.status,
        startDate: seatBooking.startTime,
        endDate: seatBooking.endTime,
        createdAt: seatBooking.createdAt,
        updatedAt: seatBooking.updatedAt,
      };
    });

    // 3. Synthesize fallback bookings from completed payments when booking docs are missing
    const existingPaymentIds = new Set(
      (bookingsRaw as any[])
        .map((b: any) => (b.payment ? String(b.payment) : null))
        .filter(Boolean),
    );

    const fallbackBookingsFromPayments = (completedPaymentsRaw as any[])
      .filter((p) => !existingPaymentIds.has(String(p._id)))
      .map((p: any) => ({
        _id: `payment-${p._id}`,
        bookingNumber: `P-${String(p.razorpayOrderId || p._id).slice(-8).toUpperCase()}`,
        type:
          p.paymentType === PaymentType.VIRTUAL_OFFICE
            ? "VirtualOffice"
            : p.paymentType === PaymentType.MEETING_ROOM
              ? "MeetingRoom"
              : "CoworkingSpace",
        spaceId: p.space,
        user: p.user,
        spaceSnapshot: {
          _id: p.space,
          name: p.spaceName,
          address: "",
          city: "",
          image: "",
        },
        plan: {
          name: p.planName || "Booked Plan",
          price: p.totalAmount || 0,
          tenure: p.tenure || 1,
          tenureUnit: "months",
        },
        status: "pending_kyc",
        startDate: p.startDate || p.createdAt,
        endDate: p.startDate || p.createdAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));

    // 4. Combine and Re-sort
    // Note: This merging logic is simplified. For large datasets, a more robust paginated merge would be needed.
    const allBookings = [
      ...bookingsRaw.map((b) => b.toObject()),
      ...normalizedSeatBookings,
      ...fallbackBookingsFromPayments,
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, Number(limit));

    // Calculate days remaining for each booking
    const bookingsWithDays = allBookings.map((booking: any) => {
      if (booking.endDate) {
        const now = new Date();
        const end = new Date(booking.endDate);
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        booking.daysRemaining = diffDays > 0 ? diffDays : 0;
      }
      return booking;
    });

    res.status(200).json({
      success: true,
      data: bookingsWithDays,
      pagination: {
        total:
          totalBookingsMain +
          totalSeatBookingsCount +
          fallbackBookingsFromPayments.length,
        page: Number(page),
        pages: Math.ceil(
          (totalBookingsMain +
            totalSeatBookingsCount +
            fallbackBookingsFromPayments.length) /
          Number(limit),
        ),
      },
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bookings" });
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bookingId } = req.params;

    // 1. Try finding in main BookingModel
    let booking = await BookingModel.findOne({
      _id: bookingId,
      user: userId,
      isDeleted: false,
    });

    if (booking) {
      // AUTO-FIX: Transition pending_kyc to active if user is already verified
      const user = await UserModel.findById(userId);
      if (user?.kycVerified && booking.status === "pending_kyc") {
        booking.status = "active";
        booking.kycStatus = "approved";
        
        // Add timeline entry for the automatic activation
        booking.timeline = booking.timeline || [];
        booking.timeline.push({
          status: "activated_automatically",
          date: new Date(),
          note: "Booking activated automatically as user KYC is already verified.",
          by: "System"
        });

        await booking.save();
      }

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
      return res.status(200).json({ success: true, data: bookingObj });
    }

    // 2. Try finding in SeatBookingModel
    const seatBooking = await SeatBookingModel.findOne({
      _id: bookingId,
      user: userId,
    }).populate("space");

    if (seatBooking) {
      const s = seatBooking.toObject() as any;
      const space = s.space || {};
      const normalized = {
        _id: s._id,
        bookingNumber: s.paymentId
          ? `SB-${s.paymentId.slice(-6).toUpperCase()}`
          : `SB-${s._id.toString().slice(-6).toUpperCase()}`,
        type: "CoworkingSpace",
        spaceId: space._id || s.space,
        user: s.user,
        spaceSnapshot: {
          _id: space._id,
          name: space.name,
          address: space.address,
          city: space.city,
          image: space.images?.[0] || "",
        },
        plan: {
          name: "Seat Booking",
          price: s.totalAmount,
          tenure: 1,
          tenureUnit: "booking",
        },
        status:
          s.status === "confirmed"
            ? "active"
            : s.status === "pending"
              ? "pending_payment"
              : s.status,
        startDate: s.startTime,
        endDate: s.endTime,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };

      if ((normalized as any).endDate) {
        const now = new Date();
        const end = new Date((normalized as any).endDate);
        const diffTime = end.getTime() - now.getTime();
        (normalized as any).daysRemaining = Math.max(
          0,
          Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
        );
      }
      return res.status(200).json({ success: true, data: normalized });
    }

    return res
      .status(404)
      .json({ success: false, message: "Booking not found" });
  } catch (error) {
    console.error("Get booking error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch booking" });
  }
};

export const getBookingsByProperty = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { spaceId } = req.params;
    const { year, month } = req.query;

    const filter: any = {
      user: userId,
      spaceId: new mongoose.Types.ObjectId(spaceId as string),
      isDeleted: false,
    };

    if (year || month) {
      const dateFilter: any = {};
      const now = new Date();
      const currentYear = year ? Number(year) : now.getFullYear();

      if (month) {
        const monthIndex = Number(month) - 1; // 0-indexed
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
        // Only year provided
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
        dateFilter.$gte = startDate;
        dateFilter.$lte = endDate;
      }
      filter.createdAt = dateFilter;
    }

    const bookings = await BookingModel.find(filter)
      .populate("user")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Get bookings by property error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings for this property",
    });
  }
};

export const toggleAutoRenew = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bookingId } = req.params;
    const { autoRenew } = req.body;

    const booking = await BookingModel.findOneAndUpdate(
      { _id: bookingId, user: userId, isDeleted: false },
      { autoRenew, updatedAt: new Date() },
      { new: true },
    );

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    res.status(200).json({
      success: true,
      message: `Auto-renewal ${autoRenew ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    console.error("Toggle auto-renew error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update auto-renewal" });
  }
};

// Link booking to KYC profile
export const linkBookingToProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const bookingId = req.params.bookingId as string;
    const { profileId } = req.body;

    if (!profileId) {
      return res
        .status(400)
        .json({ success: false, message: "Profile ID required" });
    }

    // Verify profile exists and belongs to user
    const profile = await KYCDocumentModel.findOne({
      _id: profileId,
      user: userId,
    });
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    }

    // Check if profile is approved
    if (profile.overallStatus !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Profile must be approved before linking",
      });
    }

    // Verify booking exists and belongs to user
    const booking = await BookingModel.findOne({
      _id: bookingId,
      user: userId,
    });
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    // Link profile to booking
    booking.kycProfile = profileId as any;
    booking.kycStatus = "approved";
    booking.status = "active";

    // Set start and end dates if not already set
    if (!booking.startDate) {
      booking.startDate = new Date();
    }
    if (!booking.endDate) {
      const endDate = new Date(booking.startDate);
      endDate.setMonth(endDate.getMonth() + (booking.plan?.tenure || 12));
      booking.endDate = endDate;
    }

    await booking.save();

    // Add booking to profile's linkedBookings if not already there
    if (!profile.linkedBookings?.includes(bookingId)) {
      profile.linkedBookings = profile.linkedBookings || [];
      profile.linkedBookings.push(bookingId);
      await profile.save();
    }

    res.status(200).json({
      success: true,
      message: "Booking linked to profile successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Link booking error:", error);
    res.status(500).json({ success: false, message: "Failed to link booking" });
  }
};

// ============ KYC ============

export const getKYCStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { profileId } = req.query;
    console.log(`[getKYCStatus] User: ${userId}, ProfileId: ${profileId}`);

    if (profileId) {
      if (profileId === "new") {
        return res.status(200).json({ success: true, data: null });
      }

      if (!mongoose.Types.ObjectId.isValid(profileId as string)) {
        console.log(`[getKYCStatus] Invalid profileId format: ${profileId}`);
        return res
          .status(400)
          .json({ success: false, message: "Invalid Profile ID format" });
      }

      // 1. Try finding in KYCDocument (Individual)
      const userObject = new mongoose.Types.ObjectId(userId as string);
      const profileObject = new mongoose.Types.ObjectId(profileId as string);
      let kyc: any = await KYCDocumentModel.findOne({
        _id: profileObject,
        user: userObject,
        isDeleted: { $ne: true },
      });
      console.log("[getKYCStatus] KYC: ", kyc);
      // 2. If not found, try BusinessInfoModel
      if (!kyc) {
        const businessInfo = await BusinessInfoModel.findOne({
          _id: profileId,
          user: userId,
          isDeleted: { $ne: true },
        });

        if (businessInfo) {
          // Fetch Main Individual Profile for Personal Info
          const mainProfile = await KYCDocumentModel.findOne({
            user: userId,
            kycType: "individual",
          });

          // Map BusinessInfo to KYCData structure
          kyc = {
            _id: businessInfo._id,
            user: businessInfo.user,
            profileName: businessInfo.profileName || businessInfo.companyName,
            kycType: "business",
            isPartner: false,
            personalInfo: mainProfile?.personalInfo || {},
            businessInfo: {
              companyName: businessInfo.companyName,
              companyType: businessInfo.companyType,
              gstNumber: businessInfo.gstNumber,
              panNumber: businessInfo.panNumber,
              cinNumber: businessInfo.cinNumber,
              registeredAddress: businessInfo.registeredAddress,
              industry: businessInfo.industry,
              partners: [],
              verified: businessInfo.status === "approved",
            },
            documents: businessInfo.documents || [],
            overallStatus: businessInfo.status || "pending",
            rejectionReason: businessInfo.rejectionReason,
            progress: calculateKYCProgress({
              kycType: "business",
              documents: businessInfo.documents || [],
              businessInfo: businessInfo,
              personalInfo: mainProfile?.personalInfo || {},
            }),
            createdAt: businessInfo.createdAt,
            updatedAt: businessInfo.updatedAt,
          };
        }
      }

      if (!kyc) {
        // 3. Try PartnerKYCModel for single fetch if needed
        const partner = await PartnerKYCModel.findOne({
          _id: profileId,
          user: userId,
        });
        if (partner) {
          // Map partner to KYCData structure
          kyc = {
            _id: partner._id,
            user: partner.user,
            profileName: partner.fullName, // Use partner's fullName as profileName
            kycType: "individual",
            isPartner: true,
            personalInfo: {
              fullName: partner.fullName,
              email: partner.email,
              phone: partner.phone,
              panNumber: partner.panNumber,
              aadhaarNumber: partner.aadhaarNumber,
              dateOfBirth: partner.dob,
            },
            businessInfo: {
              companyName: "N/A",
              partners: [],
            },
            documents: partner.documents || [],
            overallStatus: partner.status || "pending",
            rejectionReason: partner.rejectionReason,
            progress: 0,
            createdAt: partner.createdAt,
            updatedAt: partner.updatedAt,
          };
        }
      }

      if (!kyc) {
        console.log("[getKYCStatus] Profile not found for ID:", profileId);
        return res
          .status(404)
          .json({ success: false, message: "Profile not found" });
      }
      return res.status(200).json({ success: true, data: kyc });
    }

    // Get all user's profiles (Combined)

    // 1. Individual Profile
    const individualProfiles = await KYCDocumentModel.find({
      user: userId,
      isDeleted: { $ne: true },
      kycType: "individual",
    });
    console.log(
      `[getKYCStatus] Found ${individualProfiles.length} individual profiles`,
    );

    // 2. Business Profiles (from BusinessInfoModel)
    const businessProfiles = await BusinessInfoModel.find({
      user: userId,
      isDeleted: { $ne: true },
    });

    // 3. Partner Profiles
    const partnerProfiles = await PartnerKYCModel.find({
      user: userId,
      isDeleted: { $ne: true },
    });
    console.log(
      `[getKYCStatus] Found ${businessProfiles.length} business profiles`,
    );

    // debug query without filters
    const allUserDocs = await KYCDocumentModel.find({ user: userId });
    console.log(
      `[getKYCStatus] Total KYCDocuments for user (no filters): ${allUserDocs.length}`,
    );
    if (allUserDocs.length > 0) {
      console.log(
        `[getKYCStatus] First doc types: ${allUserDocs.map((d) => d.kycType).join(", ")}`,
      );
      console.log(
        `[getKYCStatus] First doc isDeleted: ${allUserDocs.map((d) => d.isDeleted).join(", ")}`,
      );
    }

    // Find main profile for personal info
    const mainProfile = individualProfiles.find(
      (p) => p.kycType === "individual",
    );

    // Map Business Profiles to KYCData
    const mappedBusinessProfiles = businessProfiles.map((b) => ({
      _id: b._id,
      user: b.user,
      profileName: b.profileName || b.companyName,
      kycType: "business",
      isPartner: false,
      personalInfo: mainProfile?.personalInfo || {},
      businessInfo: {
        companyName: b.companyName,
        companyType: b.companyType,
        gstNumber: b.gstNumber,
        panNumber: b.panNumber,
        cinNumber: b.cinNumber,
        registeredAddress: b.registeredAddress,
        industry: b.industry,
        verified: b.status === "approved",
      },
      documents: b.documents || [],
      overallStatus: b.status || "pending",
      rejectionReason: b.rejectionReason,
      progress: 0,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));

    // Map Partner Profiles to KYCData
    const mappedPartnerProfiles = partnerProfiles.map((p) => ({
      _id: p._id,
      user: p.user,
      profileName: p.fullName,
      kycType: "individual",
      isPartner: true,
      personalInfo: {
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        panNumber: p.panNumber,
        aadhaarNumber: p.aadhaarNumber,
        dateOfBirth: p.dob,
      },
      businessInfo: {
        companyName: "N/A",
        partners: [],
      },
      documents: p.documents || [],
      overallStatus: p.status || "pending",
      progress: 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    // Combine
    const allProfiles = [
      ...individualProfiles,
      ...mappedBusinessProfiles,
      ...mappedPartnerProfiles,
    ];

    res.status(200).json({ success: true, data: allProfiles });
  } catch (error) {
    console.error("Get KYC error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch KYC status" });
  }
};

export const getBusinessInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const businessInfo = await BusinessInfoModel.findOne({ user: userId });
    res.status(200).json({ success: true, data: businessInfo });
  } catch (error) {
    console.error("Get Business Info error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch business info" });
  }
};

export const updateBusinessInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      companyName,
      companyType,
      gstNumber,
      panNumber,
      cinNumber,
      registeredAddress,
      industry,
      profileId,
      profileName,
      kycType,
      partners,
      personalPhone,
      personalDob,
      personalAadhaar,
      personalPan,
      personalFullName,
      personalEmail,
    } = req.body;
    console.log(
      `[updateBusinessInfo] User: ${userId}, ProfileId: ${profileId}, Type: ${kycType}`,
    );

    // ============================================
    // CASE 1: BUSINESS PROFILE (Using BusinessInfoModel)
    // ============================================
    if (kycType === "business" || (profileId && profileId !== "new")) {
      let businessInfo = null;
      // Check if profileId is valid business info
      if (profileId && profileId !== "new") {
        if (!mongoose.Types.ObjectId.isValid(profileId as string)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid Profile ID format" });
        }
        businessInfo = await BusinessInfoModel.findOne({
          _id: profileId,
          user: userId,
        });
      }

      if (businessInfo || kycType === "business") {
        console.log("[updateBusinessInfo] Processing as Business Profile");

        if (!businessInfo) {
          const mainProfile = await KYCDocumentModel.findOne({
            user: userId,
            kycType: "individual",
          });

          // Fallback for company name to avoid validation error
          const safeCompanyName =
            companyName || profileName || "Draft Business Profile";

          businessInfo = new BusinessInfoModel({
            user: userId,
            kycProfile: mainProfile?._id,
            profileName: profileName || safeCompanyName,
            status: "in_progress",
            companyName: safeCompanyName,
          });
        }

        if (companyName) businessInfo.companyName = companyName;
        if (companyType) businessInfo.companyType = companyType;
        if (gstNumber) businessInfo.gstNumber = gstNumber;
        if (panNumber) businessInfo.panNumber = panNumber;
        if (cinNumber) businessInfo.cinNumber = cinNumber;
        if (registeredAddress)
          businessInfo.registeredAddress = registeredAddress;
        if (industry) businessInfo.industry = industry;
        if (profileName) businessInfo.profileName = profileName;

        // Ensure status is in_progress if it was not started, but don't revert pending/approved
        if (!businessInfo.status || businessInfo.status === "not_started") {
          businessInfo.status = "in_progress";
        }

        // Remove rejection reason if being updated (optional, but good for drafts)
        if (businessInfo.status === "in_progress") {
          businessInfo.rejectionReason = undefined;
        }

        businessInfo.updatedAt = new Date();

        try {
          await businessInfo.save();

          // Recalculate and update businessInfoCount in main KYC Profile
          // Use ObjectId for query to ensure match
          const userObjectId = new mongoose.Types.ObjectId(userId);
          let pendingBusinessCount = await BusinessInfoModel.countDocuments({
            user: userObjectId,
            status: "pending",
          });

          console.log(
            `[updateBusinessInfo] Recalculated Pending Count: ${pendingBusinessCount} for user ${userId}`,
          );

          // Fallback: If we just saved a pending doc, count should be at least 1
          if (pendingBusinessCount === 0 && businessInfo.status === "pending") {
            console.log(
              "[updateBusinessInfo] Count is 0 but doc is pending. Forcing count update.",
            );
            // Try to find the main KYC profile and increment manually if recalculation failed
            const kycProfile = await KYCDocumentModel.findOne({ user: userId });
            if (kycProfile) {
              pendingBusinessCount = (kycProfile.businessInfoCount || 0) + 1;
            } else {
              pendingBusinessCount = 1;
            }
          }

          await KYCDocumentModel.findOneAndUpdate(
            { user: userId },
            { businessInfoCount: pendingBusinessCount },
          );
        } catch (saveError) {
          console.error("[updateBusinessInfo] Save Error:", saveError);
          return res.status(400).json({
            success: false,
            message: "Validation Failed: " + (saveError as Error).message,
          });
        }

        return res.status(200).json({
          success: true,
          message: "Business Profile updated",
          data: {
            _id: businessInfo._id,
            kycType: "business",
            profileName: businessInfo.profileName,
            businessInfo: {
              companyName: businessInfo.companyName,
              companyType: businessInfo.companyType,
              gstNumber: businessInfo.gstNumber,
              panNumber: businessInfo.panNumber,
              cinNumber: businessInfo.cinNumber,
              registeredAddress: businessInfo.registeredAddress,
              industry: businessInfo.industry,
            },
            overallStatus: businessInfo.status,
          },
        });
      }
    }

    // ============================================
    // CASE 2: INDIVIDUAL PROFILE (Legacy / Main Profile)
    // ============================================
    console.log(
      "[updateBusinessInfo] Processing as Individual/Main Profile (Legacy)",
    );

    let kyc;
    if (profileId && profileId !== "new") {
      kyc = await KYCDocumentModel.findOne({ _id: profileId, user: userId });
      if (!kyc) {
        console.log(
          "[updateBusinessInfo] Profile not found for update:",
          profileId,
        );
        return res
          .status(404)
          .json({ success: false, message: "Profile not found" });
      }
    } else {
      console.log("[updateBusinessInfo] Creating NEW profile");
      const user = await UserModel.findById(userId);
      const isPartnerProfile =
        kycType === "individual" &&
        !!personalFullName &&
        personalFullName !== user?.fullName;
      kyc = new KYCDocumentModel({
        user: userId,
        profileName:
          profileName ||
          (kycType === "business" ? companyName : "Personal Profile"),
        kycType: kycType || "individual",
        isPartner: Boolean(isPartnerProfile),
        personalInfo: {
          fullName: personalFullName || user?.fullName,
          email: isPartnerProfile ? personalEmail : user?.email,
          phone: user?.phoneNumber,
        },
      });
    }

    // Update business info if provided (Legacy support)
    if (companyName || gstNumber || partners) {
      kyc.businessInfo = {
        companyName: companyName || kyc.businessInfo?.companyName,
        companyType: companyType || kyc.businessInfo?.companyType,
        gstNumber: gstNumber || kyc.businessInfo?.gstNumber,
        panNumber: panNumber || kyc.businessInfo?.panNumber,
        cinNumber: cinNumber || kyc.businessInfo?.cinNumber,
        registeredAddress:
          registeredAddress || kyc.businessInfo?.registeredAddress,
        industry: industry || kyc.businessInfo?.industry,
        partners: partners || kyc.businessInfo?.partners || [],
        verified: false,
      };
    }

    // Update personal info logic (Legacy support)
    if (
      personalPhone ||
      personalDob ||
      personalAadhaar ||
      personalPan ||
      personalFullName ||
      personalEmail
    ) {
      if (!kyc.personalInfo) {
        const user = await UserModel.findById(userId);
        kyc.personalInfo = {
          fullName: user?.fullName,
          email: user?.email,
          phone: user?.phoneNumber,
        };
      }

      if (personalPhone) kyc.personalInfo.phone = personalPhone;
      if (personalEmail) kyc.personalInfo.email = personalEmail;
      if (personalDob) kyc.personalInfo.dateOfBirth = personalDob;
      if (personalAadhaar) kyc.personalInfo.aadhaarNumber = personalAadhaar;
      if (personalPan) kyc.personalInfo.panNumber = personalPan;
      if (personalFullName) {
        kyc.personalInfo.fullName = personalFullName;
        // Update isPartner flag if changing fullName on existing individual profile
        if (kyc.kycType === "individual") {
          const user = await UserModel.findById(userId);
          kyc.isPartner = personalFullName !== user?.fullName;
        }
      }
    }

    if (kycType && !kyc.kycType) {
      kyc.kycType = kycType;
    }

    if (profileName) {
      kyc.profileName = profileName;
    }

    kyc.progress = calculateKYCProgress(kyc);
    kyc.updatedAt = new Date();

    if (kyc.overallStatus === "not_started" && kyc.progress > 0) {
      kyc.overallStatus = "in_progress";
    }

    await kyc.save();
    console.log("[updateBusinessInfo] Saved profile:", kyc._id);

    // Sync legacy BusinessInfoModel logic removed as we use direct logic now.

    res
      .status(200)
      .json({ success: true, message: "Profile updated", data: kyc });
  } catch (error) {
    console.error("Update business info error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update profile" });
  }
};

export const uploadKYCDocument = async (req: Request, res: Response) => {
  console.log("==== UPLOAD KYC DOCUMENT START ====");
  try {
    const userId = req.user?.id;
    const { documentType, profileId } = req.body;
    const file = req.file;

    console.log(
      `[STEP 1] User: ${userId}, ProfileId: ${profileId}, DocType: ${documentType}, File: ${file?.filename}`,
    );

    if (!documentType) {
      console.log("[STEP 1a] FAIL: No documentType");
      return res
        .status(400)
        .json({ success: false, message: "Document type required" });
    }

    if (!file) {
      console.log("[STEP 1b] FAIL: No file received");
      return res.status(400).json({
        success: false,
        message: "No file uploaded (check size/type)",
      });
    }

    if (!profileId) {
      console.log("[STEP 1c] FAIL: No profileId");
      return res
        .status(400)
        .json({ success: false, message: "Profile ID required" });
    }

    console.log("[STEP 2] Validating profileId format...");
    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      console.log("[STEP 2a] FAIL: Invalid profileId format");
      return res
        .status(400)
        .json({ success: false, message: "Invalid Profile ID format" });
    }

    console.log("[STEP 3] Finding KYC profile in database...");
    console.log("[STEP 3] profileId:", profileId, "userId:", userId);

    let kyc: any = await KYCDocumentModel.findOne({
      _id: profileId,
      user: userId,
    });
    console.log("[STEP 3b] KYCDocumentModel result:", kyc ? "FOUND" : "NOT FOUND");

    if (!kyc) {
      // Check if it is a partner profile
      kyc = await PartnerKYCModel.findOne({ _id: profileId, user: userId });
      console.log("[STEP 3c] PartnerKYCModel result:", kyc ? "FOUND" : "NOT FOUND");
    }

    if (!kyc) {
      // Check if it is a business profile
      kyc = await BusinessInfoModel.findOne({ _id: profileId, user: userId });
      console.log("[STEP 3d] BusinessInfoModel result:", kyc ? "FOUND" : "NOT FOUND");

      if (!kyc) {
        // Debug: check if the profile exists at all (without user filter)
        const anyProfile = await BusinessInfoModel.findById(profileId);
        console.log("[STEP 3e] BusinessInfo exists without user filter:", anyProfile ? `YES (user: ${anyProfile.user})` : "NO");
      }
    }

    if (!kyc) {
      console.log("[STEP 3a] FAIL: Profile not found for:", profileId, "user:", userId);
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    }

    console.log("[STEP 4] Profile found. Building document entry...");
    // Generate file URL using the updated helper
    const fileUrl = getMulterFileUrl(file.filename, documentType);

    // Check if document type already exists
    const existingIndex =
      kyc.documents?.findIndex(
        (d: KYCDocumentItem) => d.type === documentType,
      ) ?? -1;
    console.log("[STEP 4a] Existing doc index:", existingIndex);

    const docEntry = {
      type: documentType,
      name: file.originalname,
      fileUrl,
      status: "pending" as const,
      uploadedAt: new Date(),
    };
    console.log("[STEP 4b] Doc entry created:", docEntry);

    if (existingIndex >= 0) {
      // Delete old file if exists
      const oldDoc = kyc.documents![existingIndex];
      if (oldDoc.fileUrl) {
        try {
          const oldFilename = oldDoc.fileUrl.split("/").pop();
          if (oldFilename) {
            // Determine directory based on document type
            const subDir =
              oldDoc.type === "video_kyc" ? "video-kyc" : "kyc-documents";
            const uploadsDir = path.join(
              __dirname,
              "../../../../uploads",
              subDir,
            );
            const oldFilePath = path.join(uploadsDir, oldFilename);
            if (fs.existsSync(oldFilePath)) {
              fs.unlink(oldFilePath, (err) => {
                if (err) console.error("[Delete Old File] Error:", err);
                else
                  console.log(
                    "[Delete Old File] Success:",
                    oldFilename,
                    "from",
                    subDir,
                  );
              });
            }
          }
        } catch (err: any) {
          console.error("[Delete Old File] Critical Error:", err);
        }
      }

      kyc.documents![existingIndex] = docEntry;
    } else {
      kyc.documents = kyc.documents || [];
      kyc.documents.push(docEntry);
    }

    // Explicitly mark documents as modified to ensure Mongoose saves the array update
    kyc.markModified("documents");

    // Update progress
    // Update progress - only for models that support it
    if (typeof kyc.kycType !== "undefined") {
      // KYCDocument or PartnerKYC model
      kyc.progress = calculateKYCProgress(kyc);
      if (kyc.overallStatus === "not_started") {
        kyc.overallStatus = "in_progress";
      }
    } else {
      // BusinessInfo model - uses 'status' not 'overallStatus', no 'progress' field
      if (kyc.status === "in_progress" || !kyc.status) {
        kyc.status = "in_progress";
      }
    }
    kyc.updatedAt = new Date();

    await kyc.save();

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: docEntry,
    });
  } catch (error: any) {
    console.error("Upload KYC doc error:", error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    res.status(500).json({
      success: false,
      message: "Failed to upload document",
      error: error?.message,
    });
  }
};

// Delete KYC document
export const deleteKYCDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const bodyProfileId = req.body?.profileId;
    const bodyDocType = req.body?.documentType;
    const queryProfileId = req.query?.profileId;
    const queryDocType = req.query?.documentType;

    const profileId = (bodyProfileId || queryProfileId) as string;
    const documentType = (bodyDocType || queryDocType) as string;

    console.log(
      `[deleteKYCDocument] User: ${userId}, ProfileId: ${profileId}, DocType: ${documentType}`,
    );

    if (!profileId || !documentType) {
      return res.status(400).json({
        success: false,
        message: "Profile ID and document type required",
      });
    }

    let kyc: any = await KYCDocumentModel.findOne({
      _id: profileId,
      user: userId,
    });

    if (!kyc) {
      // Check if it is a partner profile
      kyc = await PartnerKYCModel.findOne({
        _id: profileId,
        user: userId,
      });
    }

    if (!kyc) {
      // Check if it is a business profile
      kyc = await BusinessInfoModel.findOne({ _id: profileId, user: userId });
    }

    if (!kyc) {
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    }

    // Find the document to be deleted for file removal
    const docToDelete = kyc.documents?.find(
      (d: KYCDocumentItem) => d.type === documentType,
    );

    if (!docToDelete) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found" });
    }

    // Filter out the document to be deleted
    kyc.documents = kyc.documents?.filter((d: any) => d.type !== documentType) || [];

    // Explicitly mark documents as modified for Mongoose
    kyc.markModified("documents");

    // Delete file from disk if exists
    if (docToDelete.fileUrl) {
      const filename = docToDelete.fileUrl.split("/").pop();
      if (filename) {
        const subDir =
          docToDelete.type === "video_kyc" ? "video-kyc" : "kyc-documents";
        const filePath = path.join(
          __dirname,
          "../../../../uploads",
          subDir,
          filename,
        );
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error("[Delete File] Error:", err);
            else console.log("[Delete File] Success:", filename);
          });
        }
      }
    }

    // Update progress/status - only for models that support it
    if (typeof kyc.kycType !== "undefined") {
      // KYCDocument or PartnerKYC model
      kyc.progress = calculateKYCProgress(kyc);

      // If was approved/pending and user deletes doc, revert to in_progress
      if (kyc.overallStatus === "approved" || kyc.overallStatus === "pending") {
        kyc.overallStatus = "in_progress";
        // Sync User verification status
        await UserModel.findByIdAndUpdate(userId, { kycVerified: false });
      }
    } else {
      // BusinessInfo model
      if (kyc.status === "approved" || kyc.status === "pending") {
        kyc.status = "in_progress";
      }
    }

    kyc.updatedAt = new Date();
    await kyc.save();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete KYC doc error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete document",
      error: error?.message,
    });
  }
};

export const submitKYCForReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { profileId } = req.body;
    console.log(`[submitKYCForReview] User: ${userId}, Body:`, req.body);

    if (!profileId) {
      return res
        .status(400)
        .json({ success: false, message: "Profile ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(profileId as string)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Profile ID format" });
    }

    let kyc: any = await KYCDocumentModel.findOne({
      _id: profileId,
      user: userId,
    });

    let isBusinessInfoDoc = false;
    let isPartner = false;

    if (!kyc) {
      console.log(
        `[submitKYCForReview] Not found in KYCDocument, checking PartnerKYC...`,
      );
      kyc = await PartnerKYCModel.findOne({ _id: profileId, user: userId });
      if (kyc) {
        console.log(`[submitKYCForReview] Found in PartnerKYC`);
        isPartner = true;
      }
    } else {
      console.log(`[submitKYCForReview] Found in KYCDocument`);
    }

    if (!kyc) {
      // Check BusinessInfoModel as fallback
      console.log(
        `[submitKYCForReview] Not found in PartnerKYC, checking BusinessInfoModel...`,
      );
      kyc = await BusinessInfoModel.findOne({ _id: profileId, user: userId });
      if (kyc) {
        console.log(`[submitKYCForReview] Found in BusinessInfoModel`);
        isBusinessInfoDoc = true;
      }
    }

    if (!kyc) {
      return res
        .status(404)
        .json({ success: false, message: "KYC profile not found" });
    }

    // Check status based on model type
    const status =
      isPartner || isBusinessInfoDoc ? kyc.status : kyc.overallStatus;
    if (status === "pending" || status === "approved") {
      return res.status(400).json({
        success: false,
        message:
          status === "approved"
            ? "KYC is already approved"
            : "KYC is already under review",
      });
    }

    // Validate requirements
    const uploadedDocs = kyc.documents?.map((d: any) => d.type) || [];
    let requiredDocs: string[];

    if (isPartner) {
      // Partner Validation
      if (!kyc.fullName || !kyc.panNumber || !kyc.aadhaarNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Please complete partner details (PAN, Aadhaar) before submitting",
        });
      }
      requiredDocs = ["pan_card", "aadhaar"];
    } else if (isBusinessInfoDoc) {
      // Business Info Validation
      if (!kyc.companyName || !kyc.gstNumber) {
        return res.status(400).json({
          success: false,
          message: "Please complete all business information before submitting",
        });
      }
      // Business Profile Docs
      requiredDocs = ["pan_card", "gst_certificate", "address_proof"];
    } else {
      // KYCDocument Validation
      const isBusiness = kyc.kycType === "business";
      // ... previous validation logic for KYCDocument ...
      if (
        !kyc.personalInfo?.fullName ||
        !kyc.personalInfo?.aadhaarNumber ||
        !kyc.personalInfo?.panNumber
      ) {
        return res.status(400).json({
          success: false,
          message: "Please complete all personal information before submitting",
        });
      }

      if (
        isBusiness &&
        (!kyc.businessInfo?.companyName || !kyc.businessInfo?.gstNumber)
      ) {
        return res.status(400).json({
          success: false,
          message: "Please complete all business information before submitting",
        });
      }

      const isPartnerProfile = kyc.isPartner === true;
      if (isBusiness) {
        requiredDocs = [
          "pan_card",
          "gst_certificate",
          "address_proof",
          "video_kyc",
        ];
      } else if (isPartnerProfile) {
        requiredDocs = ["pan_card", "aadhaar"];
      } else {
        requiredDocs = ["pan_card", "aadhaar", "video_kyc"];
      }
    }

    const missingDocs = requiredDocs.filter(
      (doc) => !uploadedDocs.includes(doc),
    );
    if (missingDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please upload all required documents: ${missingDocs.join(", ")}`,
      });
    }

    // Submit for review
    if (isPartner || isBusinessInfoDoc) {
      kyc.status = "pending";
    } else {
      kyc.overallStatus = "pending";
      kyc.progress = calculateKYCProgress(kyc);
    }
    kyc.updatedAt = new Date();

    await kyc.save();

    // Recalculate businessInfoCount if it's a Business Info doc
    if (isBusinessInfoDoc) {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const pendingBusinessCount = await BusinessInfoModel.countDocuments({
        user: userObjectId,
        status: "pending",
      });

      await KYCDocumentModel.findOneAndUpdate(
        { user: userId },
        { businessInfoCount: pendingBusinessCount },
      );
    }

    // Recalculate partnerCount if it's a Partner KYC doc
    if (isPartner) {
      const pendingPartnerCount = await PartnerKYCModel.countDocuments({
        user: userId,
        status: "pending",
        isDeleted: { $ne: true },
      });

      await KYCDocumentModel.findOneAndUpdate(
        { user: userId },
        { partnerCount: pendingPartnerCount },
      );
    }

    // Notify Admin
    try {
      const user = await UserModel.findById(userId);
      const userName = user?.fullName || "User";

      let title = "New KYC Request";
      let message = `${userName} has submitted a KYC request for review.`;

      if (isPartner) {
        title = "New Partner KYC Request";
        message = `${userName} has submitted a Partner KYC request.`;
      } else if (isBusinessInfoDoc) {
        title = "New Business Profile Request";
        message = `${userName} has submitted a Business Profile for review.`;
      }

      await NotificationService.notifyAdmin(
        title,
        message,
        NotificationType.INFO,
        {
          userId,
          kycId: profileId,
          type: isPartner
            ? "partner"
            : isBusinessInfoDoc
              ? "business"
              : "individual",
        },
      );
    } catch (notifError) {
      console.error(
        "[submitKYCForReview] Failed to send notification:",
        notifError,
      );
    }

    res.status(200).json({
      success: true,
      message:
        "KYC submitted for review successfully. Our team will review it shortly.",
      data: kyc,
    });
  } catch (error: any) {
    console.error("Submit KYC error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit KYC for review",
      error: error.message,
      stack: error.stack,
    });
  }
};

// Delete KYC Profile
export const deleteKYCProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { profileId } = req.params;
    console.log(`[deleteKYCProfile] User: ${userId}, ProfileId: ${profileId}`);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!profileId || profileId === "undefined" || profileId === "null") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Profile ID required" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId as string);
    const profileObjectId = new mongoose.Types.ObjectId(profileId as string);

    // Attempt to find profile first to get documents for cleanup
    let profileToClear = await KYCDocumentModel.findOne({ _id: profileObjectId, user: userObjectId });
    if (!profileToClear) profileToClear = await PartnerKYCModel.findOne({ _id: profileObjectId, user: userObjectId });
    if (!profileToClear) profileToClear = await BusinessInfoModel.findOne({ _id: profileObjectId, user: userObjectId });

    // Cleanup Files from Disk
    if (profileToClear && profileToClear.documents && profileToClear.documents.length > 0) {
      console.log(`[deleteKYCProfile] Cleaning up ${profileToClear.documents.length} files for profile ${profileId}`);
      for (const doc of (profileToClear.documents as any[])) {
        if (doc.fileUrl) {
          try {
            const filename = doc.fileUrl.split("/").pop();
            if (filename) {
              const subDir = doc.type === "video_kyc" ? "video-kyc" : "kyc-documents";
              const filePath = path.join(__dirname, "../../../../uploads", subDir, filename);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[deleteKYCProfile] Deleted file: ${filename}`);
              }
            }
          } catch (fileErr) {
            console.error(`[deleteKYCProfile] Error deleting file from disk:`, fileErr);
          }
        }
      }
    }

    // Hard Delete from all 3 possible models
    let profile: any = await KYCDocumentModel.findOneAndDelete(
      { _id: profileObjectId, user: userObjectId }
    );

    if (!profile) {
      profile = await PartnerKYCModel.findOneAndDelete(
        { _id: profileObjectId, user: userObjectId }
      );
    }

    if (!profile) {
      profile = await BusinessInfoModel.findOneAndDelete(
        { _id: profileObjectId, user: userObjectId }
      );
    }

    if (!profile) {
      console.log(`[deleteKYCProfile] FAIL: Profile not found or already deleted: ${profileId}`);
      return res
        .status(404)
        .json({ success: false, message: "Profile not found or already removed" });
    }

    console.log(`[deleteKYCProfile] SUCCESS: Removed profile ${profileId} from database.`);

    res.status(200).json({
      success: true,
      message: "Profile deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete KYC Profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete profile",
      error: error.message,
    });
  }
};

function calculateKYCProgress(kyc: any): number {
  let progress = 0;
  // Check if it's a BusinessInfo document (has companyName at root, no kycType field usually)
  const isBusinessDoc = !!kyc.companyName && !kyc.personalInfo;

  const isBusiness = kyc.kycType === "business" || isBusinessDoc;
  const isPartner =
    kyc.isPartner === true ||
    (!!kyc.fullName && !kyc.personalInfo && !kyc.companyName); // PartnerKYC has fullName at root

  // Weights based on type
  // Individual: Personal(30), Docs(50), Status(20)
  // Partner: Personal(50), Docs(50) - no video KYC
  // Business: Personal(25), Business(25), Docs(40), Status(10)

  // Explicit handling for BusinessInfoModel
  if (isBusinessDoc) {
    // For BusinessInfoModel, we assume personal info is handled via main profile
    progress += 25; // Auto-credit for personal info
    if (kyc.companyName) progress += 25;

    // Check documents for Business Info
    const requiredDocs = ["pan_card", "gst_certificate", "address_proof"];
    const uploadedDocs = kyc.documents?.map((d: any) => d.type) || [];
    const hasRequiredCount = requiredDocs.filter((d) =>
      uploadedDocs.includes(d),
    ).length;
    progress += Math.round((hasRequiredCount / requiredDocs.length) * 40);

    if (kyc.status === "approved" || kyc.status === "pending") progress += 10;

    return Math.min(progress, 100);
  }

  if (isBusiness) {
    if (kyc.personalInfo?.fullName) progress += 25; // Might be missing for BusinessInfoModel, that's okay
    if (kyc.businessInfo?.companyName || kyc.companyName) progress += 25;

    const requiredDocs = [
      "pan_card",
      "gst_certificate",
      "address_proof",
      // "video_kyc", // Video KYC might not be required for pure business profile if personal is separate?
      // But let's keep it consistent with previous logic or adjust.
      // If it's BusinessInfoModel, we might strictly check docs.
    ];
    // Adjust required docs based on whether it's linked or standalone?
    // For now, keep as is but check root documents

    const uploadedDocs = kyc.documents?.map((d: any) => d.type) || [];
    const hasRequiredCount = requiredDocs.filter((d) =>
      uploadedDocs.includes(d),
    ).length;
    progress += Math.round((hasRequiredCount / requiredDocs.length) * 40);

    if (kyc.overallStatus === "approved" || kyc.status === "approved")
      progress += 10;
  } else if (isPartner) {
    // Partner profile - no video KYC required
    if (
      kyc.personalInfo?.fullName &&
      kyc.personalInfo?.aadhaarNumber &&
      kyc.personalInfo?.panNumber
    )
      progress += 50;

    const requiredDocs = ["pan_card", "aadhaar"]; // No video_kyc for partners
    const uploadedDocs = kyc.documents?.map((d: any) => d.type) || [];
    const hasRequiredCount = requiredDocs.filter((d) =>
      uploadedDocs.includes(d),
    ).length;
    progress += Math.round((hasRequiredCount / requiredDocs.length) * 50);
  } else {
    // Individual
    if (
      kyc.personalInfo?.fullName &&
      kyc.personalInfo?.aadhaarNumber &&
      kyc.personalInfo?.panNumber
    )
      progress += 30;

    const requiredDocs = ["pan_card", "aadhaar", "video_kyc"];
    const uploadedDocs = kyc.documents?.map((d: any) => d.type) || [];
    const hasRequiredCount = requiredDocs.filter((d) =>
      uploadedDocs.includes(d),
    ).length;
    progress += Math.round((hasRequiredCount / requiredDocs.length) * 50);

    if (kyc.overallStatus === "approved") progress += 20;
  }

  return Math.min(progress, 100);
}

// ============ INVOICES ============

export const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, fromDate, toDate, page = 1, limit = 100 } = req.query;

    const filter: any = { user: userId, isDeleted: false };
    if (status) filter.status = status;
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate as string);
      if (toDate) filter.createdAt.$lte = new Date(toDate as string);
    }

    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.min(Number(limit) || 10, 100);
    const skip = (_page - 1) * _limit;

    const [invoices, total, summary] = await Promise.all([
      InvoiceModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(_limit),
      InvoiceModel.countDocuments(filter),
      InvoiceModel.aggregate([
        { $match: { user: userId, isDeleted: false } },
        {
          $group: {
            _id: null,
            totalPaid: {
              $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] },
            },
            totalPending: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$total", 0] },
            },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalPaid: summary[0]?.totalPaid || 0,
          totalPending: summary[0]?.totalPending || 0,
          totalInvoices: total,
        },
        invoices,
      },
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(req.query.limit || 10)),
      },
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch invoices" });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { invoiceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId as string)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Invoice ID format" });
    }

    const invoice = await InvoiceModel.findOne({
      _id: invoiceId,
      user: userId,
      isDeleted: false,
    });

    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    console.error("Get invoice error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch invoice" });
  }
};

// ============ SUPPORT TICKETS ============

export const getAllTickets = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, page = 1, limit = 100 } = req.query;

    const filter: any = { user: userId, isDeleted: false };
    if (status) filter.status = status;

    const limitNum = Number(limit) || 100;
    const skip = (Number(page) - 1) * limitNum;

    const [tickets, total] = await Promise.all([
      SupportTicketModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("-messages"),
      SupportTicketModel.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: tickets,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get tickets error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch tickets" });
  }
};

export const createTicket = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { subject, category, priority, description, bookingId } = req.body;

    if (!subject || !category || !description) {
      return res.status(400).json({
        success: false,
        message: "Subject, category, and description are required",
      });
    }

    // Generate ticket number
    const count = await SupportTicketModel.countDocuments();
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const ticket = await SupportTicketModel.create({
      ticketNumber,
      user: userId,
      bookingId,
      subject,
      category,
      priority: priority || "medium",
      status: "open",
      messages: [
        {
          sender: "user",
          senderName: req.user?.email || "User",
          senderId: userId,
          message: description,
          createdAt: new Date(),
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Support ticket created",
      data: {
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
      },
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create ticket" });
  }
};

export const getTicketById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { ticketId } = req.params;

    const ticket = await SupportTicketModel.findOne({
      _id: ticketId,
      user: userId,
      isDeleted: false,
    });

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch ticket" });
  }
};

export const replyToTicket = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    const ticket = await SupportTicketModel.findOne({
      _id: ticketId,
      user: userId,
      isDeleted: false,
    });

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    ticket.messages = ticket.messages || [];
    ticket.messages.push({
      sender: "user",
      senderName: req.user?.email || "User",
      senderId: userId as any,
      message,
      createdAt: new Date(),
    });

    if (ticket.status === "waiting_customer") {
      ticket.status = "in_progress";
    }

    ticket.updatedAt = new Date();
    await ticket.save();

    res.status(200).json({ success: true, message: "Reply sent" });
  } catch (error) {
    console.error("Reply to ticket error:", error);
    res.status(500).json({ success: false, message: "Failed to send reply" });
  }
};

// ============ CREDITS & REWARDS ============

export const getCredits = async (req: Request, res: Response) => {
  try {
    const validation = getCreditsSchema.safeParse(req);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: validation.error,
      });
    }

    const userId = req.user?.id;
    const { page, limit } = validation.data.query;

    // Default to 1 and 20 if not provided
    const _page = page || 1;
    const _limit = limit || 20;

    // Get User for current balance
    const user = await UserModel.findById(userId);

    // Get Credit History
    const history = await CreditLedgerModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((_page - 1) * _limit)
      .limit(_limit);

    // Calculate total earned (optional, or just use history)
    const totalEarned = await CreditLedgerModel.aggregate([
      { $match: { user: userId, type: CreditType.EARNED } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        balance: user?.credits || 0,
        totalEarned: totalEarned[0]?.total || 0,
        history,
        rewardThreshold: 5000,
        canRedeem: (user?.credits || 0) >= 5000,
      },
    });
  } catch (error) {
    console.error("Get credits error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch credits" });
  }
};

export const redeemReward = async (req: Request, res: Response) => {
  try {
    const validation = redeemRewardSchema.safeParse(req);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: validation.error,
      });
    }

    const userId = req.user?.id;
    const { spaceId, spaceName, date, timeSlot } = validation.data.body; // Expecting meeting details

    const REWARD_COST = 5000;

    // ATOMIC CHECK-AND-DECREMENT (Prevents Double-Spend Race Condition)
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId, credits: { $gte: REWARD_COST } },
      { $inc: { credits: -REWARD_COST } },
      { new: true }, // Returns the document AFTER the update
    );

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: "Insufficient credits or user not found",
      });
    }

    let booking;
    try {
      // Create Booking (Free)
      const bookingCount = await BookingModel.countDocuments();
      const bookingNumber = `FS-RW-${new Date().getFullYear()}-${String(bookingCount + 1).padStart(5, "0")}`;

      booking = await BookingModel.create({
        bookingNumber,
        user: userId,
        partner: new mongoose.Types.ObjectId(), // Required field
        type: "MeetingRoom",
        spaceId: spaceId
          ? new mongoose.Types.ObjectId(spaceId)
          : new mongoose.Types.ObjectId(), // Must be valid ObjectId
        spaceSnapshot: { name: spaceName || "Free Meeting Room Reward" },
        plan: {
          name: "1 Hour Free Meeting Room",
          price: 0,
          tenure: 1,
          tenureUnit: "hours",
        },
        status: "active",
        timeline: [
          {
            status: "redeemed",
            date: new Date(),
            note: `Redeemed ${REWARD_COST} credits for free meeting room`,
            by: "User",
          },
        ],
        startDate: new Date(date || Date.now()),
        endDate: new Date(
          new Date(date || Date.now()).getTime() + 60 * 60 * 1000,
        ), // 1 Hour
      });

      // Ledger Entry
      await CreditLedgerModel.create({
        user: userId,
        amount: -REWARD_COST, // Deduct the reward cost
        type: CreditType.SPENT,
        description: `Redeemed ${REWARD_COST} credits for 1 Hour Free Meeting Room`,
        referenceId: booking._id?.toString(),
        booking: booking._id, // Fixed bookingId -> booking matching reference schema
        balanceAfter: updatedUser.credits,
      });

      res.status(200).json({
        success: true,
        message: "Reward redeemed successfully! Meeting room booked.",
        data: booking,
      });
    } catch (bookingError) {
      // MANUAL ROLLBACK: If booking or ledger fails, explicitly refund credits
      await UserModel.updateOne(
        { _id: userId },
        { $inc: { credits: REWARD_COST } }, // Give them back
      );

      // If booking was created but ledger failed, delete the orphaned booking
      if (booking && booking._id) {
        await BookingModel.deleteOne({ _id: booking._id });
      }

      console.error(
        "Critical: Failed to generate Reward Booking, rolled back wallet.",
        bookingError,
      );
      return res.status(500).json({
        success: false,
        message:
          "Reward redemption failed during processing, credits safely refunded",
      });
    }
  } catch (error) {
    console.error("Redeem reward error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to redeem reward due to server error",
    });
  }
};

// ============ MAIL ============

export const getUserMails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const user = await UserModel.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const userEmail = user.email.trim();
    const userEmailRegex = new RegExp(`^${userEmail}$`, "i");
    const mails = await Mail.find({
      $or: [
        { email: { $regex: userEmailRegex } },
        { clientEmail: { $regex: userEmailRegex } },
      ],
    })
      .lean()
      .sort({ createdAt: -1 });

    const formattedMails = mails.map((m: any) => ({
      ...m,
      mailId: m.mailId || m._id?.toString(),
    }));

    res.status(200).json({ success: true, data: formattedMails });
  } catch (error) {
    console.error("Get user mails error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch mails" });
  }
};

// ============ VISITS ============

export const getUserVisits = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const userEmail = user.email.trim();
    const userEmailRegex = new RegExp(`^${userEmail}$`, "i");

    const visits = await Visit.find({
      $or: [
        { email: { $regex: userEmailRegex } },
        { clientEmail: { $regex: userEmailRegex } },
      ],
    })
      .lean()
      .sort({ createdAt: -1 });

    const formattedVisits = visits.map((v: any) => ({
      ...v,
      visitId: v.visitId || v._id?.toString(),
    }));

    res.status(200).json({ success: true, data: formattedVisits });
  } catch (error) {
    console.error("Get user visits error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch visits" });
  }
};

