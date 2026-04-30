import {
  UserModel,
  AuthProvider,
  UserRole,
} from "../../authModule/models/user.model";
import { BookingModel } from "../../bookingModule/booking.model";
import { STAFF_ROLES } from "../../authModule/config/permissions.config";

import { KYCDocumentModel } from "../../userDashboardModule/models/kyc.model";
import { PartnerKYCModel } from "../../userDashboardModule/models/partnerKYC.model";
import { VirtualOfficeModel } from "../../virtualOfficeModule/virtualOffice.model";
import { CoworkingSpaceModel } from "../../coworkingSpaceModule/coworkingSpace.model";
import { BusinessInfoModel } from "../../userDashboardModule/models/businessInfo.model";
import { MeetingRoomModel } from "../../meetingRoomModule/meetingRoom.model";
import { ApiResponse } from "../../authModule/types/auth.types";
import { PasswordUtil } from "../../authModule/utils/password.util";
import { EmailUtil } from "../../authModule/utils/email.util";
import mongoose from "mongoose";
import { NotificationService } from "../../notificationModule/services/notification.service";
import { NotificationType } from "../../notificationModule/models/Notification";
import { TicketModel, TicketStatus } from "../../ticketModule/models/Ticket";
import { PaymentModel } from "../../paymentModule/payment.model";
import { InvoiceModel } from "../../invoiceModule/invoice.model";
import { SpaceApprovalStatus } from "../../shared/enums/spaceApproval.enum";
import { checkAndAdvanceSpaceStatus } from "../../shared/utils/spaceOnboarding.utils";
import { PropertyModel, KYCStatus, PropertyStatus } from "../../propertyModule/property.model";
import { PartnerInvoice } from "../../spacePartnerModule/models/partnerFinancials.model";
import { PartnerInvoiceModel } from "../../partnerInvoiceModule/partnerInvoice.model";

export class AdminService {
  private mapPartnerKYC(partner: any): any {
    const raw =
      typeof partner.toObject === "function" ? partner.toObject() : partner;

    return {
      ...raw,
      partnerProfileId: raw.kycProfile?.toString?.() || raw.kycProfile,
      partnerInfo: {
        fullName: raw.fullName,
        email: raw.email,
        phone: raw.phone,
        panNumber: raw.panNumber,
        aadhaarNumber: raw.aadhaarNumber,
        verified: raw.status === "approved",
      },
      overallStatus: raw.status,
    };
  }

  private async ensurePartnerLoginAccount(partner: any): Promise<any> {
    const email = String(partner.email || "").trim().toLowerCase();
    if (!email) {
      throw new Error("Partner email is required to create login access");
    }

    let linkedUser = await UserModel.findOne({
      email,
      isDeleted: { $ne: true },
    }).select("+password");

    let resetToken: string | null = null;

    if (!linkedUser) {
      resetToken = EmailUtil.generateVerificationToken();
      const randomPassword = PasswordUtil.generateRandomPassword(18);
      const hashedPassword = await PasswordUtil.hash(randomPassword);

      linkedUser = await UserModel.create({
        email,
        fullName: partner.fullName || email.split("@")[0],
        phoneNumber: partner.phone,
        password: hashedPassword,
        authProvider: AuthProvider.LOCAL,
        role: UserRole.USER,
        isEmailVerified: true,
        kycVerified: true,
        isActive: true,
        resetPasswordToken: resetToken,
        resetPasswordExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    } else {
      const updates: any = {
        kycVerified: true,
        isActive: true,
      };
      if (!linkedUser.fullName && partner.fullName) updates.fullName = partner.fullName;
      if (!linkedUser.phoneNumber && partner.phone) updates.phoneNumber = partner.phone;
      if (!linkedUser.isEmailVerified) updates.isEmailVerified = true;
      linkedUser = await UserModel.findByIdAndUpdate(linkedUser._id, updates, {
        new: true,
      });
    }

    partner.linkedUser = linkedUser?._id;
    partner.accountLinkedAt = new Date();

    if (resetToken && linkedUser) {
      try {
        await EmailUtil.sendPasswordResetEmail(email, resetToken, linkedUser.fullName);
      } catch (emailError) {
        console.error("[ensurePartnerLoginAccount] Failed to send setup email:", emailError);
      }
    }

    return linkedUser;
  }

  /**
   * Helper to get all space IDs managed by a user (Partner or Space Manager)
   */
  private async getManagedSpaceIds(userId: string): Promise<string[]> {
    const [coworkingSpaces, virtualOffices] = await Promise.all([
      CoworkingSpaceModel.find(
        {
          $or: [{ partner: userId }, { managers: userId }],
          isDeleted: false,
        },
        "_id",
      ),
      VirtualOfficeModel.find(
        {
          $or: [{ partner: userId }, { managers: userId }],
          isDeleted: false,
        },
        "_id",
      ),
    ]);

    return [
      ...coworkingSpaces.map((s) => s._id.toString()),
      ...virtualOffices.map((s) => s._id.toString()),
    ];
  }

  // Get aggregated dashboard stats
  async getDashboardStats(user: any): Promise<ApiResponse<any>> {
    try {
      const isAdminOrStaff = STAFF_ROLES.includes(user.role);
      let spaceIds: string[] = [];

      if (!isAdminOrStaff) {
        spaceIds = await this.getManagedSpaceIds(user.id);
        // If partner has no spaces, return empty stats
        if (spaceIds.length === 0) {
          return {
            success: true,
            message: "Dashboard stats fetched successfully",
            data: {
              totalUsers: 0,
              totalBookings: 0,
              activeListings: 0,
              totalRevenue: 0,
              openTickets: 0,
              recentActivity: [],
            },
          };
        }
      }

      // 1. Total Users
      let totalUsers = 0;
      if (isAdminOrStaff) {
        totalUsers = await UserModel.countDocuments({ isDeleted: false });
      } else {
        // For partners, count unique users who have booked their spaces
        const uniqueUsers = await BookingModel.distinct("user", {
          spaceId: { $in: spaceIds },
          isDeleted: false,
        });
        totalUsers = uniqueUsers.length;
      }

      // 2. Active Bookings
      const bookingQuery: any = {
        status: { $in: ["active", "pending_kyc"] },
        isDeleted: false,
      };
      if (!isAdminOrStaff) {
        bookingQuery.spaceId = { $in: spaceIds };
      }
      const totalBookings = await BookingModel.countDocuments(bookingQuery);

      // 3. Active Listings
      let activeListings = 0;
      if (isAdminOrStaff) {
        const [voCount, csCount] = await Promise.all([
          VirtualOfficeModel.countDocuments({
            isActive: true,
            isDeleted: false,
          }),
          CoworkingSpaceModel.countDocuments({
            isActive: true,
            isDeleted: false,
          }),
        ]);
        activeListings = voCount + csCount;
      } else {
        activeListings = spaceIds.length; // Simply the count of spaces they manage
      }

      // 4. Total Revenue
      const revenueMatch: any = {
        status: { $in: ["active", "pending_kyc"] },
        isDeleted: false,
      };
      if (!isAdminOrStaff) {
        revenueMatch.spaceId = { $in: spaceIds };
      }

      const revenueAggregation = await BookingModel.aggregate([
        { $match: revenueMatch },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$plan.price" },
          },
        },
      ]);
      const totalRevenue =
        revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

      // 4.5. Open Tickets
      const ticketQuery: any = {
        status: TicketStatus.OPEN,
        isDeleted: { $ne: true }, // Tickets might not have isDeleted, but adding as precaution if it exists
      };

      if (!isAdminOrStaff) {
        // Find tickets linked to partner's bookings
        const bookingIds = await BookingModel.find({
          spaceId: { $in: spaceIds },
          isDeleted: false,
        }).distinct("_id");

        ticketQuery.bookingId = { $in: bookingIds };
      }

      const openTicketsCount = await TicketModel.countDocuments(ticketQuery);

      // 5. Recent Activity
      let recentActivity: any[] = [];

      if (isAdminOrStaff) {
        const recentUsers = await UserModel.find({ isDeleted: false })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("fullName email createdAt");

        recentActivity = recentUsers.map((u) => ({
          id: u._id,
          type: "user_joined",
          message: `New user joined: ${u.fullName}`,
          time: u.createdAt,
        }));
      } else {
        // Partners see recent bookings
        const recentBookings = await BookingModel.find({
          spaceId: { $in: spaceIds },
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("user", "fullName");

        recentActivity = recentBookings.map((b) => ({
          id: b._id,
          type: "new_booking",
          message: `New booking link for ${(b.user as any)?.fullName || "User"}`,
          time: b.createdAt,
        }));
      }

      return {
        success: true,
        message: "Dashboard stats fetched successfully",
        data: {
          totalUsers,
          totalBookings,
          activeListings,
          totalRevenue,
          openTickets: openTicketsCount,
          recentActivity,
        },
      };
    } catch (error: any) {
      console.error("Error fetching admin stats:", error);
      return {
        success: false,
        message: "Failed to fetch admin stats",
        error: error.message,
      };
    }
  }

  // Get all partners and their details
  async getPartners(
    page: number = 1,
    limit: number = 50,
    search?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const skip = (page - 1) * limit;
      const query: any = {
        role: UserRole.PARTNER,
        isDeleted: false,
      };

      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
        ];
      }

      const partners = await UserModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await UserModel.countDocuments(query);

      // Fetch all active properties to map them to partners
      const allProperties = await PropertyModel.find({
        isDeleted: false,
      })
        .select("name city area partner")
        .lean();

      // Map properties to each partner
      const partnerDetails = partners.map((partner: any) => {
        const properties = allProperties.filter(
          (p: any) => p.partner?.toString() === partner._id.toString(),
        );

        const spaces = properties.map((p: any) => ({
          name: p.name,
          type: "Property",
          location: `${p.city}, ${p.area}`,
        }));

        return {
          id: partner._id,
          name: partner.fullName,
          email: partner.email,
          phone: partner.phoneNumber || "N/A",
          totalSpaces: spaces.length,
          spaces: spaces,
          kycVerified: partner.kycVerified,
          createdAt: partner.createdAt,
        };
      });

      return {
        success: true,
        message: "Partners fetched successfully",
        data: {
          partners: partnerDetails,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      console.error("Error in getPartners:", error);
      return {
        success: false,
        message: "Failed to fetch partners",
        error: error.message,
      };
    }
  }

  // Get all users (Admin only usually, but logic kept generic if needed)
  async getUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    deleted: boolean = false,
    role?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const skip = (page - 1) * limit;
      const query: any = { isDeleted: deleted ? true : { $ne: true } };

      if (role && role !== "all") {
        if (role === "team") {
          query.role = { $in: STAFF_ROLES };
        } else if (role.includes(",")) {
          query.role = { $in: role.split(",") };
        } else {
          query.role = role;
        }
      }

      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      const users = await UserModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-password");

      const total = await UserModel.countDocuments(query);

      // Global stats for dashboard cards (scoped to current filter)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const statsQuery = { ...query };

      const stats = {
        total: await UserModel.countDocuments(statsQuery),
        verified: await UserModel.countDocuments({
          ...statsQuery,
          isEmailVerified: true,
        }),
        newThisMonth: await UserModel.countDocuments({
          ...statsQuery,
          createdAt: { $gte: startOfMonth },
        }),
      };

      return {
        success: true,
        message: "Users fetched successfully",
        data: {
          users,
          stats,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch users",
        error: error.message,
      };
    }
  }

  async getPartnerUsers(): Promise<ApiResponse<any>> {
    try {
      const [rolePartners, properties, virtualOffices, coworkingSpaces, meetingRooms] =
        await Promise.all([
          UserModel.find({
            role: { $in: [UserRole.PARTNER, UserRole.SPACE_PARTNER_MANAGER] },
            isDeleted: { $ne: true },
          })
            .sort({ fullName: 1, createdAt: -1 })
            .select("_id fullName email phoneNumber role status isEmailVerified createdAt updatedAt"),
          PropertyModel.find({ isDeleted: { $ne: true } })
            .select("partner")
            .populate("partner", "_id fullName email phoneNumber role status isEmailVerified createdAt updatedAt"),
          VirtualOfficeModel.find({ isDeleted: { $ne: true } })
            .select("partner")
            .populate("partner", "_id fullName email phoneNumber role status isEmailVerified createdAt updatedAt"),
          CoworkingSpaceModel.find({ isDeleted: { $ne: true } })
            .select("partner")
            .populate("partner", "_id fullName email phoneNumber role status isEmailVerified createdAt updatedAt"),
          MeetingRoomModel.find({ isDeleted: { $ne: true } })
            .select("partner")
            .populate("partner", "_id fullName email phoneNumber role status isEmailVerified createdAt updatedAt"),
        ]);

      const partnerMap = new Map<string, any>();
      const addPartner = (partner: any) => {
        if (!partner) return;
        const plainPartner = partner.toObject ? partner.toObject() : partner;
        const id = plainPartner._id?.toString?.();
        if (id && !plainPartner.isDeleted) {
          partnerMap.set(id, plainPartner);
        }
      };

      rolePartners.forEach(addPartner);
      [...properties, ...virtualOffices, ...coworkingSpaces, ...meetingRooms].forEach(
        (item: any) => addPartner(item.partner),
      );

      const partners = Array.from(partnerMap.values()).sort((a, b) =>
        String(a.fullName || a.email || "").localeCompare(
          String(b.fullName || b.email || ""),
        ),
      );

      return {
        success: true,
        message: "Partner users fetched successfully",
        data: {
          partners,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch partner users",
        error: error.message,
      };
    }
  }

  // Get pending KYC requests
  async getPendingKYC(
    user: any,
    includeApproved: boolean = false,
  ): Promise<ApiResponse<any>> {
    try {
      const isAdminOrStaff = STAFF_ROLES.includes(user.role);
      let bookingIds: string[] = [];

      // If partner, first find all bookings related to their spaces
      if (!isAdminOrStaff) {
        const spaceIds = await this.getManagedSpaceIds(user.id);
        // Optimization: If no spaces, empty result
        if (spaceIds.length === 0) {
          return { success: true, message: "Pending KYC fetched", data: [] };
        }

        const bookings = await BookingModel.find(
          {
            spaceId: { $in: spaceIds },
          },
          "_id",
        );
        bookingIds = bookings.map((b) => b._id.toString());
      }

      const query: any = {
        isDeleted: false,
        overallStatus: includeApproved
          ? { $nin: ["in_progress", "not_started"] }
          : { $in: ["pending", "resubmit"] },
      };

      // If partner, filter KYC docs by linkedBookings
      if (!isAdminOrStaff && bookingIds.length > 0) {
        query.linkedBookings = { $in: bookingIds };
      }

      const kycDocs = await KYCDocumentModel.find(query)
        .select(
          "user profileName linkedBookings personalInfo businessInfo kycType isPartner documents overallStatus kycStatus progress partnerCount businessInfoCount createdAt updatedAt",
        )
        .populate("user", "fullName email phoneNumber")
        .sort({ updatedAt: -1 })
        .lean();

      const profileIds = kycDocs.map((doc: any) => doc._id);
      const userIds = kycDocs
        .map((doc: any) => doc.user?._id || doc.user)
        .filter(Boolean);

      const [
        pendingPartnerCountsByProfile,
        pendingPartnerCountsByUser,
        pendingBusinessCountsByProfile,
        pendingBusinessCountsByUser,
      ] = await Promise.all([
        PartnerKYCModel.aggregate([
          {
            $match: {
              isDeleted: { $ne: true },
              status: "pending",
              kycProfile: { $in: profileIds },
            },
          },
          { $group: { _id: "$kycProfile", count: { $sum: 1 } } },
        ]),
        PartnerKYCModel.aggregate([
          {
            $match: {
              isDeleted: { $ne: true },
              status: "pending",
              user: { $in: userIds },
            },
          },
          { $group: { _id: "$user", count: { $sum: 1 } } },
        ]),
        BusinessInfoModel.aggregate([
          {
            $match: {
              isDeleted: { $ne: true },
              status: "pending",
              kycProfile: { $in: profileIds },
            },
          },
          { $group: { _id: "$kycProfile", count: { $sum: 1 } } },
        ]),
        BusinessInfoModel.aggregate([
          {
            $match: {
              isDeleted: { $ne: true },
              status: "pending",
              user: { $in: userIds },
            },
          },
          { $group: { _id: "$user", count: { $sum: 1 } } },
        ]),
      ]);

      const partnerCountByProfile = new Map(
        pendingPartnerCountsByProfile.map((item: any) => [
          item._id.toString(),
          item.count,
        ]),
      );
      const partnerCountByUser = new Map(
        pendingPartnerCountsByUser.map((item: any) => [
          item._id.toString(),
          item.count,
        ]),
      );
      const businessCountByProfile = new Map(
        pendingBusinessCountsByProfile.map((item: any) => [
          item._id.toString(),
          item.count,
        ]),
      );
      const businessCountByUser = new Map(
        pendingBusinessCountsByUser.map((item: any) => [
          item._id.toString(),
          item.count,
        ]),
      );

      const kycDocsWithLiveCounts = kycDocs.map((doc: any) => {
        const profileId = doc._id.toString();
        const userId = (doc.user?._id || doc.user)?.toString?.();
        const partnerCount = Math.max(
          partnerCountByProfile.get(profileId) || 0,
          userId ? partnerCountByUser.get(userId) || 0 : 0,
        );
        const businessInfoCount = Math.max(
          businessCountByProfile.get(profileId) || 0,
          userId ? businessCountByUser.get(userId) || 0 : 0,
        );

        return {
          ...doc,
          partnerCount,
          businessInfoCount,
        };
      });

      return {
        success: true,
        message: includeApproved
          ? "KYC requests fetched successfully"
          : "Pending KYC requests fetched successfully",
        data: kycDocsWithLiveCounts,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch KYC requests",
        error: error.message,
      };
    }
  }

  // Delete / Restore user
  async deleteUser(
    userId: string,
    restore: boolean = false,
  ): Promise<ApiResponse<any>> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { success: false, message: "Invalid user ID format" };
      }

      const user = await UserModel.findByIdAndUpdate(
        userId,
        { isDeleted: !restore, isActive: restore },
        { new: true },
      );

      if (!user) {
        return { success: false, message: "User not found" };
      }

      return {
        success: true,
        message: restore
          ? "User restored successfully"
          : "User moved to trash successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update user status",
        error: error.message,
      };
    }
  }

  // Get all bookings
  async getAllBookings(
    user: any,
    page: number = 1,
    limit: number = 50,
    filters: { status?: string; partner?: string } = {},
  ): Promise<ApiResponse<any>> {
    try {
      const skip = (page - 1) * limit;
      const query: any = { isDeleted: false };
      const allowedStatuses = [
        "pending_payment",
        "pending_kyc",
        "active",
        "expired",
        "cancelled",
      ];

      if (filters.status && allowedStatuses.includes(filters.status)) {
        query.status = filters.status;
      }

      if (filters.partner && mongoose.Types.ObjectId.isValid(filters.partner)) {
        const partnerProperties = await PropertyModel.find(
          { partner: filters.partner },
          "_id",
        );
        const partnerPropertyIds = partnerProperties.map((property: any) => property._id);

        const [virtualOfficeIds, coworkingSpaceIds, meetingRoomIds] =
          await Promise.all([
            VirtualOfficeModel.find(
              {
                $or: [
                  { partner: filters.partner },
                  { property: { $in: partnerPropertyIds } },
                ],
              },
              "_id",
            ),
            CoworkingSpaceModel.find(
              {
                $or: [
                  { partner: filters.partner },
                  { property: { $in: partnerPropertyIds } },
                ],
              },
              "_id",
            ),
            MeetingRoomModel.find(
              {
                $or: [
                  { partner: filters.partner },
                  { property: { $in: partnerPropertyIds } },
                ],
              },
              "_id",
            ),
          ]);

        const partnerSpaceIds = [
          ...virtualOfficeIds,
          ...coworkingSpaceIds,
          ...meetingRoomIds,
        ].map((space: any) => space._id);

        query.$or = [
          { partner: filters.partner },
          { spaceId: { $in: partnerSpaceIds } },
          { "spaceSnapshot._id": { $in: partnerSpaceIds.map((id: any) => id.toString()) } },
        ];
      }

      const isAdminOrStaff = STAFF_ROLES.includes(user.role);

      if (!isAdminOrStaff) {
        const spaceIds = await this.getManagedSpaceIds(user.id);
        if (spaceIds.length === 0) {
          return {
            success: true,
            message: "Bookings fetched successfully",
            data: {
              bookings: [],
              pagination: { total: 0, page, pages: 0 },
            },
          };
        }
        query.spaceId = { $in: spaceIds };
      }

      const bookings = await BookingModel.find(query)
        .populate("user", "fullName email")
        .populate("partner", "fullName email")
        .populate("spaceSnapshot", "name city") // Helpful context
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const enrichedBookings = await this.enrichBookingsWithSpacePartner(bookings);

      const total = await BookingModel.countDocuments(query);

      return {
        success: true,
        message: "Bookings fetched successfully",
        data: {
          bookings: enrichedBookings,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch bookings",
        error: error.message,
      };
    }
  }

  async getTrackProgressData(): Promise<ApiResponse<any>> {
    try {
      const bookings = await BookingModel.find({ isDeleted: false })
        .populate("user", "fullName kycVerified")
        .populate("kycProfile", "overallStatus")
        .sort({ createdAt: -1 })
        .lean();

      const userIds = bookings.map((b: any) => b.user?._id?.toString()).filter(Boolean);

      // Fetch all approved partner KYCs for these users in one go
      const approvedPartnerKycs = await PartnerKYCModel.find({
        user: { $in: userIds },
        status: "approved",
        isDeleted: { $ne: true }
      }).lean();

      const data = bookings.map((booking: any) => {
        const docs = booking.documents || [];
        
        const draftSubmitted = docs.some((doc: any) => doc.type === 'draft_agreement');
        const draftVerified = docs.some((doc: any) => (doc.type === 'signed_agreement' || doc.type === 'agreement') && doc.status === 'approved');
        const supportingDocReceived = docs.some((doc: any) => 
          ['noc', 'utility_bill', 'electricity_bill', 'other_support'].includes(doc.type)
        );

        const agreementReceived = docs.some((doc: any) => doc.type === 'signed_agreement' || doc.type === 'agreement');

        // Partner KYC is approved if there's an approved PartnerKYC record linking this user and this partner
        const partnerKycApproved = approvedPartnerKycs.some(
          (pk: any) =>
            pk.user.toString() === booking.user?._id?.toString() &&
            pk.linkedUser?.toString() === booking.partner?.toString()
        );

        return {
          id: booking._id,
          bookingId: booking.bookingNumber,
          userName: booking.user?.fullName || "N/A",
          spaceBooked: booking.spaceSnapshot?.name || "N/A",
          userKycApprovedByAdmin: booking.user?.kycVerified || false,
          userKycApprovedBySpace: partnerKycApproved,
          draftSubmitted,
          draftVerified,
          agreementReceived,
          supportingDocReceived
        };
      });

      return {
        success: true,
        message: "Track progress data fetched successfully",
        data
      };
    } catch (error: any) {
      console.error("Error in getTrackProgressData:", error);
      return {
        success: false,
        message: "Failed to fetch track progress data",
        error: error.message
      };
    }
  }

  private async enrichBookingsWithSpacePartner(bookings: any[]) {
    const candidateSpaceIds = new Set<string>();

    bookings.forEach((booking: any) => {
      const plainBooking = booking.toObject ? booking.toObject() : booking;
      const ids = [
        plainBooking.spaceId?.toString?.(),
        plainBooking.spaceSnapshot?._id?.toString?.(),
      ].filter(Boolean);

      ids.forEach((id) => {
        if (mongoose.Types.ObjectId.isValid(id)) {
          candidateSpaceIds.add(id);
        }
      });
    });

    const spaceIds = Array.from(candidateSpaceIds);

    if (!spaceIds.length) {
      return bookings.map((booking: any) =>
        booking.toObject ? booking.toObject() : booking,
      );
    }

    const populateSpacePartner = [
      { path: "partner", select: "fullName email" },
      { path: "property", select: "partner", populate: { path: "partner", select: "fullName email" } },
    ];

    const [virtualOffices, coworkingSpaces, meetingRooms] = await Promise.all([
      VirtualOfficeModel.find({ _id: { $in: spaceIds } })
        .select("partner property")
        .populate(populateSpacePartner),
      CoworkingSpaceModel.find({ _id: { $in: spaceIds } })
        .select("partner property")
        .populate(populateSpacePartner),
      MeetingRoomModel.find({ _id: { $in: spaceIds } })
        .select("partner property")
        .populate(populateSpacePartner),
    ]);

    const partnerBySpaceId = new Map<string, any>();
    [...virtualOffices, ...coworkingSpaces, ...meetingRooms].forEach(
      (space: any) => {
        if (!space?._id) return;

        const directPartner = space.partner;
        const propertyPartner =
          space.property &&
          typeof space.property === "object" &&
          (space.property as any).partner;
        const resolvedPartner = directPartner || propertyPartner;

        if (resolvedPartner) {
          partnerBySpaceId.set(space._id.toString(), resolvedPartner);
        }
      },
    );

    return bookings.map((booking: any) => {
      const plainBooking = booking.toObject ? booking.toObject() : booking;
      const spacePartner =
        partnerBySpaceId.get(plainBooking.spaceId?.toString?.()) ||
        partnerBySpaceId.get(plainBooking.spaceSnapshot?._id?.toString?.());
      const bookingPartner = plainBooking.partner;
      const hasBookingPartnerName =
        bookingPartner &&
        typeof bookingPartner === "object" &&
        (bookingPartner.fullName || bookingPartner.email);

      return {
        ...plainBooking,
        partner: hasBookingPartnerName ? bookingPartner : spacePartner || bookingPartner,
      };
    });
  }

  async updateBookingStatus(
    user: any,
    bookingId: string,
    status: string,
  ): Promise<ApiResponse<any>> {
    try {
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return { success: false, message: "Booking not found" };
      }

      const query: any = { _id: bookingId, isDeleted: false };
      const isAdminOrStaff = STAFF_ROLES.includes(user.role);

      if (!isAdminOrStaff) {
        const spaceIds = await this.getManagedSpaceIds(user.id);
        query.spaceId = { $in: spaceIds };
      }

      const booking = await BookingModel.findOne(query);

      if (!booking) {
        return { success: false, message: "Booking not found" };
      }

      booking.status = status;
      booking.updatedAt = new Date();
      booking.timeline = [
        ...(booking.timeline || []),
        {
          status,
          date: new Date(),
          note: `Status updated by admin to ${status.replace(/_/g, " ")}`,
          by: user?.id || user?._id?.toString?.() || "admin",
        },
      ];

      await booking.save();

      const updatedBooking = await BookingModel.findById(booking._id)
        .populate("user", "fullName email")
        .populate("partner", "fullName email")
        .populate("spaceSnapshot", "name city");

      return {
        success: true,
        message: "Booking status updated successfully",
        data: updatedBooking,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update booking status",
        error: error.message,
      };
    }
  }

  private resolveClientStatus(bookings: any[]): "Active" | "At Risk" | "Churned" {
    if (!bookings.length) return "At Risk";

    const hasActive = bookings.some((b) => b.status === "active");
    if (hasActive) return "Active";

    const hasPending = bookings.some((b) =>
      ["pending_payment", "pending_kyc"].includes(b.status),
    );
    if (hasPending) return "At Risk";

    const allClosed = bookings.every((b) =>
      ["expired", "cancelled"].includes(b.status),
    );
    if (allClosed) return "Churned";

    return "At Risk";
  }

  private normalizeBookingType(type?: string): string {
    if (type === "VirtualOffice") return "Virtual Office";
    if (type === "CoworkingSpace") return "Coworking Space";
    if (type === "MeetingRoom") return "Meeting Room";
    return type || "Unknown";
  }

  // Get all clients (derived from bookings)
  async getClients(
    user: any,
    page: number = 1,
    limit: number = 50,
    search?: string,
    statusFilter?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const isAdminOrSales = STAFF_ROLES.includes(user.role);
      const query: any = { isDeleted: false };

      if (!isAdminOrSales) {
        const spaceIds = await this.getManagedSpaceIds(user.id);
        if (spaceIds.length === 0) {
          return {
            success: true,
            message: "Clients fetched successfully",
            data: {
              clients: [],
              pagination: { total: 0, page, pages: 0 },
              stats: { total: 0, active: 0, atRisk: 0, churned: 0 },
            },
          };
        }
        query.spaceId = { $in: spaceIds };
      }

      const allBookings = await BookingModel.find(query)
        .populate("user", "fullName email phoneNumber")
        .sort({ createdAt: -1 });

      const clientMap = new Map<string, any>();

      allBookings.forEach((booking: any) => {
        if (!booking.user?._id) return;

        const userId = booking.user._id.toString();
        const bookingAmount = Number(booking.amount || booking.plan?.price || 0);
        const bookingDate = new Date(booking.createdAt);
        const existing = clientMap.get(userId);

        if (!existing) {
          clientMap.set(userId, {
            id: userId,
            name: booking.user.fullName || booking.user.email || "Unknown Client",
            email: booking.user.email || "",
            phone: booking.user.phoneNumber || "",
            totalRevenue: bookingAmount,
            bookingCount: 1,
            activeBookings: booking.status === "active" ? 1 : 0,
            firstBookingDate: bookingDate,
            lastBookingDate: bookingDate,
            bookings: [booking],
          });
          return;
        }

        existing.totalRevenue += bookingAmount;
        existing.bookingCount += 1;
        existing.activeBookings += booking.status === "active" ? 1 : 0;
        existing.bookings.push(booking);

        if (bookingDate > existing.lastBookingDate) {
          existing.lastBookingDate = bookingDate;
        }
        if (bookingDate < existing.firstBookingDate) {
          existing.firstBookingDate = bookingDate;
        }
      });

      let clients = Array.from(clientMap.values()).map((client) => {
        const statusLabel = this.resolveClientStatus(client.bookings);
        return {
          id: client.id,
          name: client.name,
          email: client.email || "-",
          phone: client.phone || "-",
          bookingCount: client.bookingCount,
          activeBookings: client.activeBookings,
          totalRevenue: client.totalRevenue,
          firstBookingDate: client.firstBookingDate?.toISOString?.() || null,
          lastBookingDate: client.lastBookingDate?.toISOString?.() || null,
          statusLabel,
          initials: client.name
            .split(" ")
            .slice(0, 2)
            .map((part: string) => part[0] || "")
            .join("")
            .toUpperCase(),
        };
      });

      if (search) {
        const lower = search.trim().toLowerCase();
        clients = clients.filter(
          (client) =>
            client.name.toLowerCase().includes(lower) ||
            client.email.toLowerCase().includes(lower) ||
            client.phone.toLowerCase().includes(lower),
        );
      }

      const stats = { total: clients.length, active: 0, atRisk: 0, churned: 0 };
      clients.forEach((client) => {
        if (client.statusLabel === "Active") stats.active += 1;
        else if (client.statusLabel === "At Risk") stats.atRisk += 1;
        else stats.churned += 1;
      });

      if (statusFilter && statusFilter !== "all") {
        const normalized =
          statusFilter === "at_risk"
            ? "At Risk"
            : statusFilter === "active"
              ? "Active"
              : statusFilter === "churned"
                ? "Churned"
                : statusFilter;
        clients = clients.filter((client) => client.statusLabel === normalized);
      }

      clients.sort(
        (a, b) =>
          new Date(b.lastBookingDate || 0).getTime() -
          new Date(a.lastBookingDate || 0).getTime(),
      );

      const total = clients.length;
      const skip = (page - 1) * limit;
      const paginatedClients = clients.slice(skip, skip + limit);

      return {
        success: true,
        message: "Clients fetched successfully",
        data: {
          clients: paginatedClients,
          stats,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      console.error("Error in getClients:", error);
      return {
        success: false,
        message: "Failed to fetch clients",
        error: error.message,
      };
    }
  }

  async getClientDetails(user: any, clientId: string): Promise<ApiResponse<any>> {
    try {
      const isAdminOrSales = STAFF_ROLES.includes(user.role);
      const query: any = {
        user: clientId,
        isDeleted: false,
      };

      if (!isAdminOrSales) {
        const spaceIds = await this.getManagedSpaceIds(user.id);
        if (spaceIds.length === 0) {
          return { success: false, message: "Client not found" };
        }
        query.spaceId = { $in: spaceIds };
      }

      const bookings = await BookingModel.find(query)
        .populate("user", "fullName email phoneNumber")
        .sort({ createdAt: -1 });

      if (!bookings.length || !bookings[0].user) {
        return { success: false, message: "Client not found" };
      }

      const clientUser: any = bookings[0].user;
      const totalRevenue = bookings.reduce(
        (sum: number, booking: any) =>
          sum + Number(booking.amount || booking.plan?.price || 0),
        0,
      );

      const statusLabel = this.resolveClientStatus(bookings);
      const activeBookings = bookings.filter((booking: any) => booking.status === "active").length;

      return {
        success: true,
        message: "Client details fetched successfully",
        data: {
          client: {
            id: clientUser._id?.toString?.() || clientId,
            name: clientUser.fullName || clientUser.email || "Unknown Client",
            email: clientUser.email || "-",
            phone: clientUser.phoneNumber || "-",
            totalBookings: bookings.length,
            activeBookings,
            totalRevenue,
            firstBookingDate: bookings[bookings.length - 1]?.createdAt || null,
            lastBookingDate: bookings[0]?.createdAt || null,
            statusLabel,
          },
          bookings: bookings.map((booking: any) => ({
            id: booking._id?.toString?.() || "",
            bookingNumber: booking.bookingNumber || "-",
            type: this.normalizeBookingType(booking.type),
            status: booking.status || "pending_payment",
            planName: booking.plan?.name || "-",
            planTenure:
              booking.plan?.tenure && booking.plan?.tenureUnit
                ? `${booking.plan.tenure} ${booking.plan.tenureUnit}`
                : null,
            amount: Number(booking.amount || booking.plan?.price || 0),
            spaceName: booking.spaceSnapshot?.name || "Unknown Space",
            spaceCity: booking.spaceSnapshot?.city || null,
            startDate: booking.startDate || null,
            endDate: booking.endDate || null,
            createdAt: booking.createdAt || null,
          })),
        },
      };
    } catch (error: any) {
      console.error("Error in getClientDetails:", error);
      return {
        success: false,
        message: "Failed to fetch client details",
        error: error.message,
      };
    }
  }

  // Review KYC document
  async reviewKYC(
    kycId: string,
    action: "approve" | "reject",
    rejectionReason?: string,
  ): Promise<ApiResponse<any>> {
    try {
      let doc: any = await KYCDocumentModel.findById(kycId);
      let type: "kyc" | "partner" | "business" = "kyc";

      if (!doc) {
        doc = await PartnerKYCModel.findById(kycId);
        type = "partner";
      }

      if (!doc) {
        doc = await BusinessInfoModel.findById(kycId);
        type = "business";
      }

      if (!doc) {
        return { success: false, message: "KYC document not found" };
      }

      // Validate action
      if (action === "approve") {
        const allApproved = doc.documents?.every(
          (d: any) => d.status === "approved",
        );
        // BusinessInfo might not have documents array initialized if empty, but usually should
        if (doc.documents && doc.documents.length > 0 && !allApproved) {
          return {
            success: false,
            message: "All documents must be approved before approving KYC",
          };
        }

        // Specific checks per type if needed
      }

      // Apply updates
      if (action === "approve") {
        if (type === "kyc") {
          doc.overallStatus = "approved";
          await UserModel.findByIdAndUpdate(doc.user, { kycVerified: true });
          if (doc.linkedBookings && doc.linkedBookings.length > 0) {
            for (const bookingId of doc.linkedBookings) {
              await BookingModel.findByIdAndUpdate(bookingId, {
                kycStatus: "approved",
                status: "active",
              });
            }
          }
          doc.status = "approved";

          // Trigger B2B2C Onboarding Hook
          try {
            const properties = await PropertyModel.find({ partner: doc.user });
            for (const prop of properties) {
              if (prop._id)
                await checkAndAdvanceSpaceStatus(
                  doc.user.toString(),
                  prop._id.toString(),
                );
            }
          } catch (hookError) {
            console.error("KYC Approval Space Hook Error:", hookError);
          }
        } else if (type === "business") {
          doc.status = "approved";
          await UserModel.findByIdAndUpdate(doc.user, { kycVerified: true });
        } else if (type === "partner") {
          doc.status = "approved";
          await this.ensurePartnerLoginAccount(doc);
        }

        doc.progress = 100;
      } else {
        // Reject
        if (type === "kyc") {
          doc.overallStatus = "rejected";
          await UserModel.findByIdAndUpdate(doc.user, { kycVerified: false });
        } else {
          doc.status = "rejected";
          doc.rejectionReason = rejectionReason;
        }

        if (doc.documents) {
          doc.documents.forEach((d: any) => {
            d.status = "rejected";
            if (rejectionReason) d.rejectionReason = rejectionReason;
            d.verifiedAt = new Date();
          });
        }

        doc.progress = 0;
      }

      doc.updatedAt = new Date();
      await doc.save();

      // Recalculate counts after saving to ensure DB state is current
      if ((type === "partner" || type === "business") && doc.user) {
        const userId = doc.user;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        if (type === "partner") {
          const pendingPartnerCount = await PartnerKYCModel.countDocuments({
            ...(doc.kycProfile ? { kycProfile: doc.kycProfile } : { user: userObjectId }),
            status: "pending",
            isDeleted: { $ne: true },
          });
          await KYCDocumentModel.findOneAndUpdate(
            doc.kycProfile ? { _id: doc.kycProfile } : { user: userObjectId },
            { partnerCount: pendingPartnerCount },
          );
        } else if (type === "business") {
          const pendingBusinessCount = await BusinessInfoModel.countDocuments({
            ...(doc.kycProfile ? { kycProfile: doc.kycProfile } : { user: userObjectId }),
            status: "pending",
            isDeleted: { $ne: true },
          });
          await KYCDocumentModel.findOneAndUpdate(
            doc.kycProfile ? { _id: doc.kycProfile } : { user: userObjectId },
            { businessInfoCount: pendingBusinessCount },
          );
        }
      }

      // Notify User
      try {
        if (doc.user) {
          const title = `KYC ${action === "approve" ? "Approved" : "Rejected"}`;
          const message =
            action === "approve"
              ? `Your KYC application has been approved.`
              : `Your KYC application has been rejected. Reason: ${rejectionReason || "Documents invalid"}`;

          await NotificationService.notifyUser(
            doc.user.toString(),
            title,
            message,
            action === "approve"
              ? NotificationType.SUCCESS
              : NotificationType.WARNING,
            { kycId, type },
          );
        }
      } catch (notifError) {
        console.error("[reviewKYC] Failed to send notification:", notifError);
      }

      return { success: true, message: `KYC ${action}ed successfully` };
    } catch (error: any) {
      console.error("Review KYC error:", error);
      return {
        success: false,
        message: "Failed to review KYC",
        error: error.message,
      };
    }
  }

  // Get single KYC details
  async getKYCDetails(kycId: string): Promise<ApiResponse<any>> {
    try {
      const kyc = await KYCDocumentModel.findById(kycId).populate(
        "user",
        "fullName email phoneNumber",
      );

      if (!kyc) {
        return { success: false, message: "KYC document not found" };
      }

      return {
        success: true,
        message: "KYC details fetched successfully",
        data: kyc,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch KYC details",
        error: error.message,
      };
    }
  }

  // Get specific Partner KYC Details
  async getPartnerDetails(partnerId: string): Promise<ApiResponse<any>> {
    try {
      const partner = await PartnerKYCModel.findById(partnerId).populate(
        "user",
        "fullName email phoneNumber",
      );

      if (!partner) {
        return { success: false, message: "Partner KYC not found" };
      }

      // Map to generic KYC Format for consistency
      const mappedData = {
        _id: partner._id,
        user: partner.user,
        kycType: "individual", // Partners are individuals
        isPartner: true,
        profileName: partner.fullName,
        personalInfo: {
          fullName: partner.fullName,
          email: partner.email,
          phone: partner.phone,
          panNumber: partner.panNumber,
          aadhaarNumber: partner.aadhaarNumber,
          dateOfBirth: partner.dob,
          address: partner.address,
          verified: partner.status === "approved",
        },
        documents: partner.documents,
        overallStatus: partner.status,
        rejectionReason: partner.rejectionReason,
        createdAt: partner.createdAt,
        updatedAt: partner.updatedAt,
      };

      return {
        success: true,
        message: "Partner KYC details fetched successfully",
        data: mappedData,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch Partner KYC details",
        error: error.message,
      };
    }
  }

  // Review specific KYC document
  async reviewKYCDocument(
    kycId: string,
    docId: string,
    action: "approve" | "reject",
    rejectionReason?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const kyc = await KYCDocumentModel.findById(kycId);

      if (kyc && kyc.documents) {
        const doc = kyc.documents.find(
          (d: any) => (d._id && d._id.toString() === docId) || d.type === docId
        );
        if (doc) {
          doc.status = action === "approve" ? "approved" : "rejected";
          if (action === "reject") {
            doc.rejectionReason = rejectionReason;
            kyc.overallStatus = "rejected";
            await UserModel.findByIdAndUpdate(kyc.user, { kycVerified: false });
          } else {
            doc.rejectionReason = undefined;
          }
          doc.verifiedAt = new Date();
          kyc.updatedAt = new Date();
          await kyc.save();
          return { success: true, message: `Document ${action}ed successfully`, data: kyc };
        }
      }

      // Fallback: Check PartnerKYC
      try {
        const partner = await PartnerKYCModel.findById(kycId);
          if (partner) {
            if (!partner.documents) {
              return {
                success: false,
                message: "No documents found in profile",
              };
            }

            const doc = partner.documents.find(
              (d: any) => d._id && d._id.toString() === docId,
            );

            if (!doc) {
              const docByType = partner.documents.find((d) => d.type === docId);
              if (docByType) {
                docByType.status =
                  action === "approve" ? "approved" : "rejected";
                if (action === "reject") {
                  docByType.rejectionReason = rejectionReason;
                } else {
                  docByType.rejectionReason = undefined;
                }
                docByType.verifiedAt = new Date();
              } else {
                return { success: false, message: "Document not found" };
              }
            } else {
              doc.status = action === "approve" ? "approved" : "rejected";
              if (action === "reject") {
                doc.rejectionReason = rejectionReason;
              } else {
                doc.rejectionReason = undefined;
              }
              doc.verifiedAt = new Date();
            }

            if (action === "reject") {
              partner.status = "rejected";
            } else {
              const allPartnerDocumentsApproved =
                partner.documents?.length > 0 &&
                partner.documents.every(
                  (partnerDoc: any) => partnerDoc.status === "approved",
                );

              if (allPartnerDocumentsApproved) {
                partner.status = "approved";
                partner.rejectionReason = undefined;
                await this.ensurePartnerLoginAccount(partner);
              }
            }

            partner.updatedAt = new Date();
            await partner.save();

            // Recalculate partnerCount for any status change
            const userId = partner.user;
            if (userId) {
              const pendingPartnerCount = await PartnerKYCModel.countDocuments({
                ...(partner.kycProfile ? { kycProfile: partner.kycProfile } : { user: userId }),
                status: "pending",
                isDeleted: { $ne: true },
              });

              await KYCDocumentModel.findOneAndUpdate(
                partner.kycProfile ? { _id: partner.kycProfile } : { user: userId },
                { partnerCount: pendingPartnerCount },
              );
            }

            return {
              success: true,
              message: `Partner Document ${action}ed successfully`,
              data: partner,
            };
          }
        } catch (innerError) {
          console.error("Inner error checking PartnerKYC doc:", innerError);
        }

        // Fallback: Check BusinessInfoModel
        try {
          const businessInfo = await BusinessInfoModel.findById(kycId);
          if (businessInfo) {
            if (!businessInfo.documents) {
              return {
                success: false,
                message: "No documents found in profile",
              };
            }

            const doc = businessInfo.documents.find(
              (d: any) => d._id && d._id.toString() === docId,
            );

            if (!doc) {
              const docByType = businessInfo.documents.find(
                (d) => d.type === docId,
              );
              if (docByType) {
                docByType.status =
                  action === "approve" ? "approved" : "rejected";
                if (action === "reject") {
                  docByType.rejectionReason = rejectionReason;
                } else {
                  docByType.rejectionReason = undefined;
                }
                docByType.verifiedAt = new Date();
              } else {
                return { success: false, message: "Document not found" };
              }
            } else {
              doc.status = action === "approve" ? "approved" : "rejected";
              if (action === "reject") {
                doc.rejectionReason = rejectionReason;
              } else {
                doc.rejectionReason = undefined;
              }
              doc.verifiedAt = new Date();
            }

            if (action === "reject") {
              businessInfo.status = "rejected";
            }

            businessInfo.updatedAt = new Date();
            await businessInfo.save();

            // Recalculate businessInfoCount for any status change
            const userId = businessInfo.user;
            if (userId) {
              const userObjectId = new mongoose.Types.ObjectId(
                userId.toString(),
              );
              const pendingBusinessCount =
                await BusinessInfoModel.countDocuments({
                  user: userObjectId,
                  status: "pending",
                });

              await KYCDocumentModel.findOneAndUpdate(
                { user: userObjectId },
                { businessInfoCount: pendingBusinessCount },
              );
            }

            return {
              success: true,
              message: `Business Document ${action}ed successfully`,
              data: businessInfo,
            };
          }
        } catch (innerError) {
          console.error("Inner error checking BusinessInfo doc:", innerError);
        }

      return { success: false, message: "KYC profile or document not found" };
    } catch (error: any) {
      console.error("Review KYC Document error:", error);
      return {
        success: false,
        message: "Failed to review document",
        error: error.message,
      };
    }
  }

  // Create a new user
  async createUser(userData: any): Promise<ApiResponse<any>> {
    try {
      const { fullName, email, password, role } = userData;

      const existingUser = await UserModel.findOne({
        email: email.toLowerCase(),
      });
      if (existingUser)
        return {
          success: false,
          message: "User with this email already exists",
        };

      const hashedPassword = await PasswordUtil.hash(password);

      const newUser = await UserModel.create({
        fullName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || "user",
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        isActive: true,
        refreshTokens: [],
      });

      return {
        success: true,
        message: "User created successfully",
        data: {
          user: {
            id: newUser._id,
            fullName: newUser.fullName,
            email: newUser.email,
            role: newUser.role,
            createdAt: newUser.createdAt,
          },
        },
      };
    } catch (error: any) {
      console.error("Create user error:", error);
      return {
        success: false,
        message: "Failed to create user",
        error: error.message,
      };
    }
  }
  // Update user details
  async updateUser(userId: string, updates: any): Promise<ApiResponse<any>> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { success: false, message: "Invalid user ID format" };
      }

      const allowedUpdates: any = {};
      if (updates.fullName) allowedUpdates.fullName = updates.fullName;
      if (updates.role) allowedUpdates.role = updates.role;
      if (updates.email) allowedUpdates.email = updates.email.toLowerCase();

      const user = await UserModel.findByIdAndUpdate(
        userId,
        { $set: allowedUpdates },
        { new: true, runValidators: true },
      ).select("-password");

      if (!user) {
        return { success: false, message: "User not found" };
      }

      return {
        success: true,
        message: "User updated successfully",
        data: user,
      };
    } catch (error: any) {
      console.error("Update user error:", error);
      // Handle duplicate email error
      if (error.code === 11000) {
        return { success: false, message: "Email already in use" };
      }
      return {
        success: false,
        message: "Failed to update user",
        error: error.message,
      };
    }
  }
  // Get Revenue Dashboard Stats
  async getRevenueDashboard(user: any): Promise<ApiResponse<any>> {
    try {
      const isAdminOrStaff = STAFF_ROLES.includes(user.role);

      let matchStage: any = {
        status: { $in: ["active", "completed"] },
        isDeleted: false,
      };

      // Restrict to managed spaces if not admin/sales
      if (!isAdminOrStaff) {
        const spaceIds = await this.getManagedSpaceIds(user.id);

        if (!spaceIds.length) {
          return {
            success: true,
            message: "No data",
            data: this.getEmptyRevenueStats(),
          };
        }

        matchStage.spaceId = { $in: spaceIds };
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // 1️⃣ Core Metrics
      const metrics = await BookingModel.aggregate([
        { $match: matchStage },
        {
          $facet: {
            totalRevenue: [
              { $group: { _id: null, amount: { $sum: "$amount" } } },
            ],
            mtdRevenue: [
              { $match: { createdAt: { $gte: startOfMonth } } },
              { $group: { _id: null, amount: { $sum: "$amount" } } },
            ],
            ytdRevenue: [
              { $match: { createdAt: { $gte: startOfYear } } },
              { $group: { _id: null, amount: { $sum: "$amount" } } },
            ],
            uniqueClients: [{ $group: { _id: "$user" } }, { $count: "count" }],
          },
        },
      ]);

      const total = metrics[0]?.totalRevenue[0]?.amount || 0;
      const mtd = metrics[0]?.mtdRevenue[0]?.amount || 0;
      const ytd = metrics[0]?.ytdRevenue[0]?.amount || 0;
      const clients = metrics[0]?.uniqueClients[0]?.count || 0;
      const avgPerClient = clients > 0 ? Math.round(total / clients) : 0;

      // 2️⃣ Revenue by City
      const byCity = await BookingModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$spaceSnapshot.city",
            revenue: { $sum: "$amount" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]);

      // 3. Revenue by Category
      const byCategory = await BookingModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$type",
            revenue: { $sum: "$plan.price" },
          },
        },
      ]);

      return {
        success: true,
        message: "Revenue dashboard stats fetched successfully",
        data: {
          metrics: {
            totalRevenue: total,
            mtdRevenue: mtd,
            ytdRevenue: ytd,
            avgRevenuePerClient: avgPerClient,
          },
          revenueByCity: byCity.map((item) => ({
            city: item._id,
            revenue: item.revenue,
            percentage:
              total > 0 ? Math.round((item.revenue / total) * 100) : 0,
          })),
          revenueByCategory: byCategory.map((item) => ({
            category: item._id,
            revenue: item.revenue,
            percentage:
              total > 0 ? Math.round((item.revenue / total) * 100) : 0,
          })),
        },
      };
    } catch (error: any) {
      console.error("Revenue dashboard error:", error);
      return {
        success: false,
        message: "Failed to fetch revenue stats",
        error: error.message,
      };
    }
  }

  // Get all partners for a specific user
  async getPartnersByUser(userId: string): Promise<ApiResponse<any>> {
    try {
      const partners = await PartnerKYCModel.find({
        user: userId,
        isDeleted: false,
      }).sort({ createdAt: -1 });

      return {
        success: true,
        message: "Partners fetched successfully",
        data: partners.map((partner) => this.mapPartnerKYC(partner)),
      };
    } catch (error: any) {
      console.error("Get partners by user error:", error);
      return {
        success: false,
        message: "Failed to fetch partners",
        error: error.message,
      };
    }
  }

  async getPartnerKYCList(
    filters: {
      userId?: string;
      profileId?: string;
      search?: string;
      status?: string;
    } = {},
  ): Promise<ApiResponse<any>> {
    try {
      const query: any = {
        isDeleted: false,
        status: { $nin: ["in_progress", "not_started"] },
      };

      if (filters.userId) {
        query.user = filters.userId;
      }

      if (filters.profileId) {
        query.kycProfile = filters.profileId;
      }

      if (filters.status && filters.status !== "all") {
        query.status = filters.status;
      }

      if (filters.search) {
        query.$or = [
          { fullName: { $regex: filters.search, $options: "i" } },
          { email: { $regex: filters.search, $options: "i" } },
          { phone: { $regex: filters.search, $options: "i" } },
        ];
      }

      const partners = await PartnerKYCModel.find(query).sort({
        createdAt: -1,
      });

      return {
        success: true,
        message: "Partner KYC records fetched successfully",
        data: partners.map((partner) => this.mapPartnerKYC(partner)),
      };
    } catch (error: any) {
      console.error("Get partner KYC list error:", error);
      return {
        success: false,
        message: "Failed to fetch partner KYC records",
        error: error.message,
      };
    }
  }

  async getPartnerKYCById(id: string): Promise<ApiResponse<any>> {
    try {
      const partner = await PartnerKYCModel.findById(id).populate(
        "user",
        "fullName email phoneNumber",
      );

      if (!partner) {
        return {
          success: false,
          message: "Partner KYC not found",
        };
      }

      return {
        success: true,
        message: "Partner KYC fetched successfully",
        data: this.mapPartnerKYC(partner),
      };
    } catch (error: any) {
      console.error("Get partner KYC by id error:", error);
      return {
        success: false,
        message: "Failed to fetch partner KYC",
        error: error.message,
      };
    }
  }

  // Update Partner Status
  async updatePartnerStatus(
    partnerId: string,
    action: "approve" | "reject",
    rejectionReason?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const partner = await PartnerKYCModel.findById(partnerId);

      if (!partner) {
        return {
          success: false,
          message: "Partner not found",
        };
      }

      partner.status = action === "approve" ? "approved" : "rejected";
      if (action === "reject") {
        partner.rejectionReason = rejectionReason;
      } else {
        partner.rejectionReason = undefined; // Clear rejection reason if approved
        await this.ensurePartnerLoginAccount(partner);
      }
      await partner.save();

      // Recalculate partnerCount in the user's KYC document
      // Rely on user ID to find the main KYC profile
      const userId = partner.user;
      if (userId) {
        const pendingPartnerCount = await PartnerKYCModel.countDocuments({
          ...(partner.kycProfile ? { kycProfile: partner.kycProfile } : { user: userId }),
          status: "pending",
          isDeleted: { $ne: true },
        });

        await KYCDocumentModel.findOneAndUpdate(
          partner.kycProfile ? { _id: partner.kycProfile } : { user: userId },
          { partnerCount: pendingPartnerCount },
        );
      }

      // Notify User
      try {
        if (partner.user) {
          const title = `Partner Application ${action === "approve" ? "Approved" : "Rejected"}`;
          const message =
            action === "approve"
              ? `Your Partner application has been approved.`
              : `Your Partner application has been rejected. Reason: ${rejectionReason}`;

          await NotificationService.notifyUser(
            partner.user.toString(),
            title,
            message,
            action === "approve"
              ? NotificationType.SUCCESS
              : NotificationType.WARNING,
            { partnerId, type: "partner" },
          );
        }
      } catch (notifError) {
        console.error(
          "[updatePartnerStatus] Failed to send notification:",
          notifError,
        );
      }

      return {
        success: true,
        message: `Partner ${action}d successfully`,
        data: partner,
      };
    } catch (error: any) {
      console.error("Update partner status error:", error);
      return {
        success: false,
        message: "Failed to update partner status",
        error: error.message,
      };
    }
  }
  // Get all partner KYC requests
  async getAllPartnerKYC(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    userId?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const skip = (page - 1) * limit;
      const query: any = {
        isDeleted: false,
        status: { $nin: ["in_progress", "not_started"] },
      };

      if (userId) {
        query.user = userId;
      }

      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ];
      }

      if (status && status !== "all") {
        query.status = status;
      }

      const partners = await PartnerKYCModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName email"); // Populate user details if needed

      const total = await PartnerKYCModel.countDocuments(query);

      return {
        success: true,
        message: "Partner KYC requests fetched successfully",
        data: {
          partners,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      console.error("Get all partner KYC error:", error);
      return {
        success: false,
        message: "Failed to fetch partner KYC requests",
        error: error.message,
      };
    }
  }

  // Get business info by user
  async getBusinessInfoByUser(userId: string): Promise<ApiResponse<any>> {
    try {
      const businessInfo = await BusinessInfoModel.find({
        user: userId,
        isDeleted: false,
        status: { $ne: "in_progress" },
      });

      if (!businessInfo) {
        return {
          success: false,
          message: "Business info not found",
        };
      }

      return {
        success: true,
        message: "Business info fetched successfully",
        data: businessInfo,
      };
    } catch (error: any) {
      console.error("Get business info error:", error);
      return {
        success: false,
        message: "Failed to fetch business info",
        error: error.message,
      };
    }
  }

  // Get business info by ID
  async getBusinessInfoById(id: string): Promise<ApiResponse<any>> {
    try {
      const businessInfo = await BusinessInfoModel.findById(id).populate(
        "user",
        "fullName email phoneNumber",
      );

      if (!businessInfo) {
        return {
          success: false,
          message: "Business info not found",
        };
      }

      // Map to generic KYC Format for consistency
      const mappedData = {
        _id: businessInfo._id,
        user: businessInfo.user,
        kycType: "business",
        isPartner: false,
        profileName: businessInfo.profileName || businessInfo.companyName,
        personalInfo: {}, // Business profiles might not have personal info directly attached in this view
        businessInfo: {
          companyName: businessInfo.companyName,
          companyType: businessInfo.companyType,
          gstNumber: businessInfo.gstNumber,
          panNumber: businessInfo.panNumber,
          cinNumber: businessInfo.cinNumber,
          registeredAddress: businessInfo.registeredAddress,
          industry: businessInfo.industry,
          partners: (businessInfo as any).partners || [],
        },
        documents: businessInfo.documents || [],
        overallStatus: businessInfo.status,
        rejectionReason: businessInfo.rejectionReason,
        createdAt: businessInfo.createdAt,
        updatedAt: businessInfo.updatedAt,
      };

      return {
        success: true,
        message: "Business info fetched successfully",
        data: mappedData,
      };
    } catch (error: any) {
      console.error("Get business info by ID error:", error);
      return {
        success: false,
        message: "Failed to fetch business info",
        error: error.message,
      };
    }
  }

  // Update business info status (Principal usage for Admin)
  async updateBusinessInfoStatus(
    id: string,
    action: "approve" | "reject",
    rejectionReason?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const businessInfo = await BusinessInfoModel.findById(id);

      if (!businessInfo) {
        return {
          success: false,
          message: "Business info not found",
        };
      }

      businessInfo.status = action === "approve" ? "approved" : "rejected";
      if (action === "reject") {
        businessInfo.rejectionReason = rejectionReason;
      } else {
        businessInfo.rejectionReason = undefined;
      }
      businessInfo.updatedAt = new Date();

      await businessInfo.save();

      // Sync user kycVerified flag
      if (businessInfo.user) {
        await UserModel.findByIdAndUpdate(businessInfo.user, {
          kycVerified: action === "approve",
        });
      }

      // Recalculate businessInfoCount in main KYC Profile
      if (businessInfo.user) {
        const pendingBusinessCount = await BusinessInfoModel.countDocuments({
          ...(businessInfo.kycProfile
            ? { kycProfile: businessInfo.kycProfile }
            : { user: businessInfo.user }),
          status: "pending",
          isDeleted: { $ne: true },
        });

        await KYCDocumentModel.findOneAndUpdate(
          businessInfo.kycProfile
            ? { _id: businessInfo.kycProfile }
            : { user: businessInfo.user },
          { businessInfoCount: pendingBusinessCount },
        );
      }

      // Notify User
      try {
        if (businessInfo.user) {
          const title = `Business Profile ${action === "approve" ? "Approved" : "Rejected"}`;
          const message =
            action === "approve"
              ? `Your Business Profile (${businessInfo.companyName}) has been approved.`
              : `Your Business Profile (${businessInfo.companyName}) has been rejected. Reason: ${rejectionReason}`;

          await NotificationService.notifyUser(
            businessInfo.user.toString(),
            title,
            message,
            action === "approve"
              ? NotificationType.SUCCESS
              : NotificationType.WARNING,
            { businessId: id, type: "business" },
          );
        }
      } catch (notifError) {
        console.error(
          "[updateBusinessInfoStatus] Failed to send notification:",
          notifError,
        );
      }

      return {
        success: true,
        message: `Business info ${action}d successfully`,
        data: businessInfo,
      };
    } catch (error: any) {
      console.error("Update business info status error:", error);
      return {
        success: false,
        message: "Failed to update business info status",
        error: error.message,
      };
    }
  }

  async getAllSpaces(
    page: number = 1,
    limit: number = 20,
    filters: { city?: string; partner?: string; search?: string; deleted?: string } = {}
  ): Promise<ApiResponse<any>> {
    try {
      const skip = (page - 1) * limit;
      const baseFilter: any = { isDeleted: String(filters.deleted) === "true" };

      if (filters.city) baseFilter.city = new RegExp(`^${filters.city}$`, "i");
      if (filters.partner) baseFilter.partner = filters.partner;

      const [vo, cs, mr] = await Promise.all([
        VirtualOfficeModel.find(baseFilter)
          .populate("partner", "fullName email")
          .populate("property"),
        CoworkingSpaceModel.find(baseFilter)
          .populate("partner", "fullName email")
          .populate("property"),
        MeetingRoomModel.find(baseFilter)
          .populate("partner", "fullName email")
          .populate("property"),
      ]);

      const mapSpace = (space: any, type: string) => {
        const obj = space.toObject();
        return {
          ...obj,
          spaceType: type,
          // Extract property fields for easier frontend consumption
          propertyName: obj.property?.name,
          propertyCity: obj.property?.city,
          propertyAddress: obj.property?.address,
        };
      };

      let allSpaces = [
        ...vo.map((s) => mapSpace(s, "virtual_office")),
        ...cs.map((s) => mapSpace(s, "coworking")),
        ...mr.map((s) => mapSpace(s, "meeting_room")),
      ];

      // Manual search filter if search term provided
      if (filters.search) {
        const search = filters.search.toLowerCase();
        allSpaces = allSpaces.filter(
          (s) =>
            s.name?.toLowerCase().includes(search) ||
            s.propertyName?.toLowerCase().includes(search) ||
            s.propertyAddress?.toLowerCase().includes(search) ||
            (s.partner as any)?.fullName?.toLowerCase().includes(search) ||
             (s.partner as any)?.email?.toLowerCase().includes(search)
        );
      }

      const totalCount = allSpaces.length;
      const paginatedSpaces = allSpaces
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(skip, skip + limit);

      return {
        success: true,
        message: "All spaces fetched successfully",
        data: {
          spaces: paginatedSpaces,
          pagination: {
            total: totalCount,
            page,
            pages: Math.ceil(totalCount / limit),
          },
        },
      };
    } catch (error: any) {
      console.error("Error fetching all spaces:", error);
      return {
        success: false,
        message: "Failed to fetch spaces",
        error: error.message,
      };
    }
  }

  // --- B2B2C Space Onboarding ---

  async getPendingSpaces(): Promise<ApiResponse<any>> {
    try {
      const query = {
        approvalStatus: SpaceApprovalStatus.PENDING_ADMIN,
        isDeleted: false,
      };

      const [vo, cs, mr] = await Promise.all([
        VirtualOfficeModel.find(query)
          .populate("partner", "fullName email")
          .populate("property", "name city"),
        CoworkingSpaceModel.find(query)
          .populate("partner", "fullName email")
          .populate("property", "name city"),
        MeetingRoomModel.find(query)
          .populate("partner", "fullName email")
          .populate("property", "name city"),
      ]);

      const mapSpace = (space: any, type: string) => ({
        ...space.toObject(),
        spaceType: type,
      });

      const allPendingSpaces = [
        ...vo.map((s) => mapSpace(s, "virtual_office")),
        ...cs.map((s) => mapSpace(s, "coworking")),
        ...mr.map((s) => mapSpace(s, "meeting_room")),
      ];

      return {
        success: true,
        message: "Pending spaces fetched successfully",
        data: allPendingSpaces.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch pending spaces",
        error: error.message,
      };
    }
  }

  async approveSpace(
    spaceType: string,
    spaceId: string,
    markups: any,
  ): Promise<ApiResponse<any>> {
    try {
      let activeModel: any;
      let finalUpdateData: any = {
        approvalStatus: SpaceApprovalStatus.ACTIVE,
        isActive: true,
      };

      if (spaceType === "virtual_office") {
        activeModel = VirtualOfficeModel;
        const space = await activeModel.findById(spaceId);
        if (!space)
          return { success: false, message: "Virtual Office not found" };

        if (markups.adminMarkupGstPerYear !== undefined) {
          finalUpdateData.adminMarkupGstPerYear = markups.adminMarkupGstPerYear;
          finalUpdateData.finalGstPricePerYear =
            (space.partnerGstPricePerYear || 0) + markups.adminMarkupGstPerYear;
        }
        if (markups.adminMarkupMailingPerYear !== undefined) {
          finalUpdateData.adminMarkupMailingPerYear =
            markups.adminMarkupMailingPerYear;
          finalUpdateData.finalMailingPricePerYear =
            (space.partnerMailingPricePerYear || 0) +
            markups.adminMarkupMailingPerYear;
        }
        if (markups.adminMarkupBrPerYear !== undefined) {
          finalUpdateData.adminMarkupBrPerYear = markups.adminMarkupBrPerYear;
          finalUpdateData.finalBrPricePerYear =
            (space.partnerBrPricePerYear || 0) + markups.adminMarkupBrPerYear;
        }
      } else if (spaceType === "coworking") {
        activeModel = CoworkingSpaceModel;
        const space = await activeModel.findById(spaceId);
        if (!space)
          return { success: false, message: "Coworking Space not found" };

        if (markups.adminMarkupPerMonth !== undefined) {
          finalUpdateData.adminMarkupPerMonth = markups.adminMarkupPerMonth;
          finalUpdateData.finalPricePerMonth =
            (space.partnerPricePerMonth || 0) + markups.adminMarkupPerMonth;
        }
      } else if (spaceType === "meeting_room") {
        activeModel = MeetingRoomModel;
        const space = await activeModel.findById(spaceId);
        if (!space)
          return { success: false, message: "Meeting Room not found" };

        if (markups.adminMarkupPerHour !== undefined) {
          finalUpdateData.adminMarkupPerHour = markups.adminMarkupPerHour;
          finalUpdateData.finalPricePerHour =
            (space.partnerPricePerHour || 0) + markups.adminMarkupPerHour;
        }
        if (markups.adminMarkupPerDay !== undefined) {
          finalUpdateData.adminMarkupPerDay = markups.adminMarkupPerDay;
          finalUpdateData.finalPricePerDay =
            (space.partnerPricePerDay || 0) + markups.adminMarkupPerDay;
        }
      } else {
        return { success: false, message: "Invalid space type" };
      }

      const updatedSpace = await activeModel.findByIdAndUpdate(
        spaceId,
        { $set: finalUpdateData },
        { new: true },
      );

      return {
        success: true,
        message: "Space approved and activated successfully",
        data: updatedSpace,
      };
    } catch (error: any) {
      console.error("Space approval error:", error);
      return {
        success: false,
        message: "Failed to approve space",
        error: error.message,
      };
    }
  }

  // Admin listing space on behalf of partner
  async listSpaceOnBehalf(
    partnerId: string,
    spaceType: "coworking" | "meeting_room" | "virtual_office",
    propertyData: any,
    spaceData: any
  ): Promise<ApiResponse<any>> {
    try {
      // 1. Create Property with Approved Status
      const property = new PropertyModel({
        ...propertyData,
        partner: partnerId,
        kycStatus: KYCStatus.APPROVED,
        status: PropertyStatus.ACTIVE,
        isActive: true,
      });
      await property.save();

      // 2. Create Space based on type
      let space;
      const commonData = {
        ...spaceData,
        property: property._id,
        partner: partnerId,
        approvalStatus: SpaceApprovalStatus.ACTIVE,
        isActive: true,
      };

      if (spaceType === "coworking") {
        space = new CoworkingSpaceModel({
          ...commonData,
          finalPricePerMonth: (spaceData.partnerPricePerMonth || 0) + (spaceData.adminMarkupPerMonth || 0),
        });
      } else if (spaceType === "meeting_room") {
        space = new MeetingRoomModel({
          ...commonData,
          finalPricePerHour: (spaceData.partnerPricePerHour || 0) + (spaceData.adminMarkupPerHour || 0),
          finalPricePerDay: (spaceData.partnerPricePerDay || 0) + (spaceData.adminMarkupPerDay || 0),
        });
      } else if (spaceType === "virtual_office") {
        space = new VirtualOfficeModel({
          ...commonData,
          finalGstPricePerYear: (spaceData.partnerGstPricePerYear || 0) + (spaceData.adminMarkupGstPerYear || 0),
          finalMailingPricePerYear: (spaceData.partnerMailingPricePerYear || 0) + (spaceData.adminMarkupMailingPerYear || 0),
          finalBrPricePerYear: (spaceData.partnerBrPricePerYear || 0) + (spaceData.adminMarkupBrPerYear || 0),
        });
      }

      if (!space) {
        return { success: false, message: "Invalid space type" };
      }

      await space.save();

      return {
        success: true,
        message: "Space listed and activated on behalf of partner successfully",
        data: { property, space },
      };
    } catch (error: any) {
      console.error("List space on behalf error:", error);
      return {
        success: false,
        message: "Failed to list space on behalf",
        error: error.message,
      };
    }
  }

  private getEmptyRevenueStats() {
    return {
      metrics: { mtd: 0, ytd: 0, avgPerClient: 0, partnerPayouts: 0 },
      byCity: [],
      byCategory: [],
    };
  }

  // Get all invoices (payments and partner-uploaded invoices)
  async getAllInvoices(
    user: any,
    page: number = 1,
    limit: number = 10,
    filters: {
      type?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    } = {},
  ): Promise<ApiResponse<any>> {
    try {
      const isAdminOrStaff = STAFF_ROLES.includes(user.role);
      const skip = (page - 1) * limit;

      const fetchB2C = !filters.type || filters.type === "all" || filters.type === "b2c";
      const fetchB2B = !filters.type || filters.type === "all" || filters.type === "b2b";

      console.log(`[AdminService] Fetching invoices. Page: ${page}, Limit: ${limit}, Type: ${filters.type}`);

      // Common Date Filter
      const dateFilter: any = {};
      if (filters.startDate || filters.endDate) {
        if (filters.startDate) dateFilter.$gte = new Date(filters.startDate);
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
      }

      // ── B2C Promise (PaymentModel) ────────────────────────────────
      const b2cPromise = (async () => {
        if (!fetchB2C) return { data: [], count: 0 };

        const b2cQuery: any = { isDeleted: { $ne: true } };
        if (!isAdminOrStaff) {
          const spaceIds = await this.getManagedSpaceIds(user.id);
          if (spaceIds.length === 0) return { data: [], count: 0 };
          b2cQuery.spaceId = { $in: spaceIds };
        }

        if (filters.status && filters.status !== "all") {
          b2cQuery.status = filters.status;
        }

        if (filters.search) {
          b2cQuery.$or = [
            { userName: { $regex: filters.search, $options: "i" } },
            { userEmail: { $regex: filters.search, $options: "i" } },
            { razorpayOrderId: { $regex: filters.search, $options: "i" } },
            { spaceName: { $regex: filters.search, $options: "i" } },
          ];
        }

        if (Object.keys(dateFilter).length > 0) {
          b2cQuery.createdAt = dateFilter;
        }

        const [payments, count] = await Promise.all([
          PaymentModel.find(b2cQuery)
            .sort({ createdAt: -1 })
            .skip(fetchB2B ? 0 : skip)
            .limit(fetchB2B ? 500 : limit) // Buffer for merging
            .lean(),
          PaymentModel.countDocuments(b2cQuery),
        ]);

        // Get invoice numbers for payments
        const paymentIds = payments.map((p) => p._id.toString());
        const invoices = await InvoiceModel.find({
          payment: { $in: paymentIds },
        }).select("payment invoiceNumber").lean();

        const data = payments.map((p) => {
          const inv = invoices.find((i) => i.payment?.toString() === p._id.toString());
          return {
            ...p,
            _id: p._id,
            invoiceNumber: inv?.invoiceNumber || "N/A",
            invoiceType: "B2C",
          };
        });

        return { data, count };
      })();

      // ── B2B Manual Promise (PartnerInvoice) ──────────────────────
      const b2bManualPromise = (async () => {
        if (!fetchB2B) return { data: [], count: 0 };

        const b2bQuery: any = {};
        // If not admin, filter by partnerId (current user)
        if (!isAdminOrStaff) {
          b2bQuery.partnerId = user.id;
        }

        if (filters.status && filters.status !== "all") {
          // Map B2C statuses to B2B if needed, or assume they are similar
          b2bQuery.status = filters.status.charAt(0).toUpperCase() + filters.status.slice(1);
        }

        if (filters.search) {
          b2bQuery.$or = [
            { invoiceId: { $regex: filters.search, $options: "i" } },
            { client: { $regex: filters.search, $options: "i" } },
            { space: { $regex: filters.search, $options: "i" } },
          ];
        }

        if (Object.keys(dateFilter).length > 0) {
          b2bQuery.createdAt = dateFilter;
        }

        const [partnerInvoices, count] = await Promise.all([
          PartnerInvoice.find(b2bQuery)
            .sort({ createdAt: -1 })
            .skip(fetchB2C ? 0 : skip)
            .limit(fetchB2C ? 500 : limit)
            .lean(),
          PartnerInvoice.countDocuments(b2bQuery),
        ]);

        const data = partnerInvoices.map((inv) => ({
          _id: inv._id,
          invoiceNumber: inv.invoiceId,
          userName: inv.client,
          userEmail: "N/A",
          totalAmount: inv.amount,
          status: inv.status?.toLowerCase() || "pending",
          paymentType: "partner_invoice",
          spaceName: inv.space,
          planName: inv.description,
          createdAt: inv.createdAt,
          razorpayOrderId: "MANUAL",
          invoiceType: "B2B_MANUAL",
        }));

        return { data, count };
      })();

      // ── B2B Uploaded Promise (PartnerInvoiceModel) ────────────────
      const b2bUploadedPromise = (async () => {
        if (!fetchB2B) return { data: [], count: 0 };

        const uploadedQuery: any = {};
        if (!isAdminOrStaff) {
          uploadedQuery.partnerId = user.id;
        }

        if (filters.status && filters.status !== "all") {
          const normalizedStatus =
            filters.status.toLowerCase() === "paid" ||
            filters.status.toLowerCase() === "completed"
              ? "Paid"
              : "Pending";
          uploadedQuery.status = {
            $in: [normalizedStatus, normalizedStatus.toUpperCase()],
          };
        }

        if (filters.search) {
          uploadedQuery.$or = [
            { invoiceNumber: { $regex: filters.search, $options: "i" } },
          ];
        }

        if (Object.keys(dateFilter).length > 0) {
          uploadedQuery.createdAt = dateFilter;
        }

        const [uploadedInvoices, count] = await Promise.all([
          PartnerInvoiceModel.find(uploadedQuery)
            .populate("partnerId", "fullName email")
            .sort({ createdAt: -1 })
            .skip(fetchB2C ? 0 : skip)
            .limit(fetchB2C ? 500 : limit)
            .lean(),
          PartnerInvoiceModel.countDocuments(uploadedQuery),
        ]);

        const data = uploadedInvoices.map((inv: any) => ({
          _id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          userName: inv.partnerId?.fullName || "Partner",
          userEmail: inv.partnerId?.email || "N/A",
          totalAmount: inv.amount,
          status: inv.status?.toLowerCase() || "pending",
          paymentType: "partner_invoice",
          spaceName: "Partner Upload",
          planName: "Physical Invoice",
          createdAt: inv.createdAt,
          razorpayOrderId: "UPLOADED",
          invoiceType: "B2B_UPLOAD",
          fileUrl: inv.fileUrl,
          paymentDetails: inv.paymentDetails,
        }));

        return { data, count };
      })();

      // ── Execute and Merge ────────────────────────────────────────
      const [b2cRes, b2bManRes, b2bUpRes] = await Promise.all([
        b2cPromise,
        b2bManualPromise,
        b2bUploadedPromise
      ]);

      let combined = [...b2cRes.data, ...b2bManRes.data, ...b2bUpRes.data];
      combined.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const totalCount = b2cRes.count + b2bManRes.count + b2bUpRes.count;
      
      // If "all" or multiple types, slice from the merged result
      const finalData = (!filters.type || filters.type === "all")
        ? combined.slice(skip, skip + limit)
        : combined;

      return {
        success: true,
        message: "Invoices fetched successfully",
        data: {
          invoices: finalData,
          pagination: {
            total: totalCount,
            page,
            pages: Math.ceil(totalCount / limit),
          },
        },
      };
    } catch (error: any) {
      console.error("Error fetching all invoices:", error);
      return {
        success: false,
        message: "Failed to fetch invoices",
        error: error.message,
      };
    }
  }

  // Get Leaderboards (Sales and Support)
  async getLeaderboard(): Promise<ApiResponse<any>> {
    try {
      // 1. Fetch Sales Staff
      const salesUsers = await UserModel.find({ role: UserRole.SALES, isDeleted: false })
        .select('_id fullName email role')
        .lean();
        
      const sales = salesUsers.map((user, index) => ({
        ...user,
        rank: index + 1
      }));

      // 2. Fetch Support Staff
      const supportUsers = await UserModel.find({ role: UserRole.SUPPORT, isDeleted: false })
        .select('_id fullName email role')
        .lean();

      const supportPromises = supportUsers.map(async (user, index) => {
        const totalTickets = await TicketModel.countDocuments({ assignee: user._id });
        const resolvedTickets = await TicketModel.countDocuments({ assignee: user._id, status: TicketStatus.RESOLVED });
        const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 100;
        let resolution = "Excellent";
        if (resolutionRate < 70) resolution = "Needs Improvement";
        else if (resolutionRate < 90) resolution = "Good";

        return {
          ...user,
          rank: index + 1,
          totalTickets,
          resolvedTickets,
          resolution,
          resolutionRate
        };
      });
      const support = await Promise.all(supportPromises);

      // Sort support by resolved tickets (descending) then re-assign rank
      support.sort((a, b) => b.resolvedTickets - a.resolvedTickets);
      const sortedSupport = support.map((s, index) => ({ ...s, rank: index + 1 }));

      return {
        success: true,
        message: "Leaderboard fetched successfully",
        data: {
          sales,
          support: sortedSupport
        }
      };
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      return {
        success: false,
        message: "Failed to fetch leaderboard",
        error: error.message
      };
    }
  }

  // Document Management - Aggregated documents from all sources
  async getAllDocuments(search?: string, type?: string, status?: string): Promise<ApiResponse<any>> {
    try {
      const results: any[] = [];

      // 1. Fetch User KYC Documents
      if (!type || type === "user") {
        const userKycQuery: any = { isDeleted: false };
        const userKycDocs = await KYCDocumentModel.find(userKycQuery)
          .populate("user", "fullName email phoneNumber")
          .lean();

        userKycDocs.forEach((kyc: any) => {
          const userName = kyc.user?.fullName || kyc.personalInfo?.fullName || "Unknown";
          const userEmail = kyc.user?.email || kyc.personalInfo?.email || "";
          
          if (search && !userName.toLowerCase().includes(search.toLowerCase()) && !userEmail.toLowerCase().includes(search.toLowerCase())) return;

          (kyc.documents || []).forEach((doc: any) => {
            if (status && doc.status !== status) return;

            const isPartnerProfile = kyc.isPartner === true;
            const docCategory = isPartnerProfile ? "Partner" : "User";

            results.push({
              id: `${kyc._id}_${doc._id || doc.type}`,
              userId: kyc.user?._id,
              ownerName: kyc.user?.fullName || userName,
              ownerEmail: userEmail,
              partnerName: isPartnerProfile ? userName : undefined,
              docType: doc.type,
              docName: doc.name || doc.type,
              fileUrl: doc.fileUrl,
              status: doc.status || "pending",
              uploadedAt: doc.uploadedAt || kyc.createdAt,
              category: docCategory,
              originalKycId: kyc._id,
            });
          });
        });
      }

      // 2. Fetch Partner KYC Documents
      if (!type || type === "partner") {
        const partnerKycQuery: any = { isDeleted: false };
        const partnerKycDocs = await PartnerKYCModel.find(partnerKycQuery)
          .populate("user", "fullName email")
          .lean();

        partnerKycDocs.forEach((kyc: any) => {
          // If we have a linked user, use their info for grouping/ownership
          // This ensures partner docs show up under the main user who added them
          const mainUser = kyc.user;
          const ownerName =
            mainUser?.fullName ||
            kyc.fullName ||
            kyc.personalInfo?.fullName ||
            "Unknown";
          const ownerEmail = mainUser?.email || kyc.email || "";
          const partnerName =
            kyc.fullName ||
            kyc.personalInfo?.fullName ||
            kyc.name ||
            "Partner";

          if (
            search &&
            !ownerName.toLowerCase().includes(search.toLowerCase()) &&
            !ownerEmail.toLowerCase().includes(search.toLowerCase()) &&
            !partnerName.toLowerCase().includes(search.toLowerCase())
          )
            return;

          (kyc.documents || []).forEach((doc: any) => {
            if (status && doc.status !== status) return;
            results.push({
              id: `${kyc._id}_${doc._id || doc.type}`,
              userId: mainUser?._id || kyc._id, // Use main user ID for grouping
              ownerName: ownerName,
              ownerEmail: ownerEmail,
              partnerName: partnerName,
              docType: doc.type,
              docName: doc.name || doc.type,
              fileUrl: doc.fileUrl,
              status: doc.status || "pending",
              uploadedAt: doc.uploadedAt || kyc.createdAt,
              category: "Partner",
              originalKycId: kyc._id,
            });
          });
        });
      }

      // 3. Fetch Business KYC Documents
      if (!type || type === "business") {
        const businessQuery: any = { isDeleted: false };
        const businessDocs = await BusinessInfoModel.find(businessQuery)
          .populate("user", "fullName email")
          .lean();

        businessDocs.forEach((biz: any) => {
          const mainUser = biz.user;
          const ownerName =
            mainUser?.fullName || biz.companyName || biz.profileName || "Unknown";
          const ownerEmail = mainUser?.email || biz.email || "";
          const bizName = biz.companyName || biz.profileName || "Business";

          if (
            search &&
            !ownerName.toLowerCase().includes(search.toLowerCase()) &&
            !ownerEmail.toLowerCase().includes(search.toLowerCase()) &&
            !bizName.toLowerCase().includes(search.toLowerCase())
          )
            return;

          (biz.documents || []).forEach((doc: any) => {
            if (status && doc.status !== status) return;
            results.push({
              id: `${biz._id}_${doc._id || doc.type}`,
              userId: mainUser?._id || biz._id,
              ownerName: ownerName,
              ownerEmail: ownerEmail,
              businessName: bizName,
              docType: doc.type,
              docName: doc.name || doc.type,
              fileUrl: doc.fileUrl,
              status: doc.status || "pending",
              uploadedAt: doc.uploadedAt || biz.createdAt,
              category: "Business",
              originalKycId: biz._id,
            });
          });
        });
      }

      // Sort by uploadedAt desc
      results.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      return {
        success: true,
        message: "Documents fetched successfully",
        data: results
      };
    } catch (error: any) {
      console.error("Error in getAllDocuments:", error);
      return {
        success: false,
        message: "Failed to fetch documents",
        error: error.message
      };
    }
  }
}
