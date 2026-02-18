import {
  UserModel,
  AuthProvider,
  UserRole,
} from "../../authModule/models/user.model";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { KYCDocumentModel } from "../../userDashboardModule/models/kyc.model";
import { PartnerKYCModel } from "../../userDashboardModule/models/partnerKYC.model";
import { VirtualOfficeModel } from "../../virtualOfficeModule/virtualOffice.model";
import { CoworkingSpaceModel } from "../../coworkingSpaceModule/coworkingSpace.model";
import { BusinessInfoModel } from "../../userDashboardModule/models/businessInfo.model";
import { ApiResponse } from "../../authModule/types/auth.types";
import { PasswordUtil } from "../../authModule/utils/password.util";
import mongoose from "mongoose";

export class AdminService {
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
      const isAdminOrSales = [UserRole.ADMIN, UserRole.SALES].includes(
        user.role,
      );
      let spaceIds: string[] = [];

      if (!isAdminOrSales) {
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
              recentActivity: [],
            },
          };
        }
      }

      // 1. Total Users
      let totalUsers = 0;
      if (isAdminOrSales) {
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
      if (!isAdminOrSales) {
        bookingQuery.spaceId = { $in: spaceIds };
      }
      const totalBookings = await BookingModel.countDocuments(bookingQuery);

      // 3. Active Listings
      let activeListings = 0;
      if (isAdminOrSales) {
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
      if (!isAdminOrSales) {
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

      // 5. Recent Activity
      let recentActivity: any[] = [];

      if (isAdminOrSales) {
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

  // Get all users (Admin only usually, but logic kept generic if needed)
  async getUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    deleted: boolean = false,
  ): Promise<ApiResponse<any>> {
    try {
      const skip = (page - 1) * limit;
      const query: any = { isDeleted: deleted };

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

      return {
        success: true,
        message: "Users fetched successfully",
        data: {
          users,
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

  // Get pending KYC requests
  async getPendingKYC(user: any): Promise<ApiResponse<any>> {
    try {
      const isAdminOrSales = [UserRole.ADMIN, UserRole.SALES].includes(
        user.role,
      );
      let bookingIds: string[] = [];

      // If partner, first find all bookings related to their spaces
      if (!isAdminOrSales) {
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
        overallStatus: { $nin: ["in_progress", "not_started"] },
      };

      // If partner, filter KYC docs by linkedBookings
      if (!isAdminOrSales && bookingIds.length > 0) {
        query.linkedBookings = { $in: bookingIds };
      }

      const kycDocs = await KYCDocumentModel.find(query)
        .populate("user", "fullName email phoneNumber")
        .sort({ updatedAt: -1 });

      return {
        success: true,
        message: "Pending KYC requests fetched successfully",
        data: kycDocs,
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
  ): Promise<ApiResponse<any>> {
    try {
      const skip = (page - 1) * limit;
      const query: any = { isDeleted: false };

      const isAdminOrSales = [UserRole.ADMIN, UserRole.SALES].includes(
        user.role,
      );

      if (!isAdminOrSales) {
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
        .populate("spaceSnapshot", "name city") // Helpful context
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await BookingModel.countDocuments(query);

      return {
        success: true,
        message: "Bookings fetched successfully",
        data: {
          bookings,
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
        } else if (type === "business") {
          doc.status = "approved";
        }

        doc.progress = 100;
      } else {
        // Reject
        if (type === "kyc") {
          doc.overallStatus = "rejected";
          await UserModel.findByIdAndUpdate(doc.user, { kycVerified: false });
        } else {
          doc.status = "rejected";
          if (type === "partner") {
            await UserModel.findByIdAndUpdate(doc.user, { kycVerified: false });
          }
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
            user: userObjectId,
            status: "pending",
          });
          await KYCDocumentModel.findOneAndUpdate(
            { user: userObjectId },
            { partnerCount: pendingPartnerCount },
          );
        } else if (type === "business") {
          const pendingBusinessCount = await BusinessInfoModel.countDocuments({
            user: userObjectId,
            status: "pending",
          });
          await KYCDocumentModel.findOneAndUpdate(
            { user: userObjectId },
            { businessInfoCount: pendingBusinessCount },
          );
        }
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

      if (!kyc) {
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
              // Sync User verification status
              await UserModel.findByIdAndUpdate(partner.user, {
                kycVerified: false,
              });
            }

            partner.updatedAt = new Date();
            await partner.save();

            // Recalculate partnerCount for any status change
            const userId = partner.user;
            if (userId) {
              const pendingPartnerCount = await PartnerKYCModel.countDocuments({
                user: userId,
                status: "pending",
                isDeleted: false,
              });

              await KYCDocumentModel.findOneAndUpdate(
                { user: userId },
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

        return { success: false, message: "KYC profile not found" };
      }

      if (!kyc.documents) {
        return { success: false, message: "No documents found in profile" };
      }

      // Find the specific document (using _id of subdocument)
      const doc = kyc.documents.find(
        (d: any) => d._id && d._id.toString() === docId,
      );

      if (!doc) {
        // Fallback: try finding by type if _id match fails (backward compatibility)
        const docByType = kyc.documents.find((d) => d.type === docId);
        if (docByType) {
          docByType.status = action === "approve" ? "approved" : "rejected";
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
        kyc.overallStatus = "rejected";
        // Sync User verification status
        await UserModel.findByIdAndUpdate(kyc.user, { kycVerified: false });
      }

      kyc.updatedAt = new Date();
      await kyc.save();

      return {
        success: true,
        message: `Document ${action}ed successfully`,
        data: kyc,
      };
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
      const isAdminOrSales = [UserRole.ADMIN, UserRole.SALES].includes(
        user.role,
      );

      let matchStage: any = {
        status: { $in: ["active", "completed"] },
        isDeleted: false,
      };

      // Restrict to managed spaces if not admin/sales
      if (!isAdminOrSales) {
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
        data: partners,
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
      }

      await partner.save();

      // Recalculate partnerCount in the user's KYC document
      // Rely on user ID to find the main KYC profile
      const userId = partner.user;
      if (userId) {
        const pendingPartnerCount = await PartnerKYCModel.countDocuments({
          user: userId,
          status: "pending",
        });

        await KYCDocumentModel.findOneAndUpdate(
          { user: userId },
          { partnerCount: pendingPartnerCount },
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

      // Recalculate businessInfoCount in main KYC Profile
      if (businessInfo.user) {
        const pendingBusinessCount = await BusinessInfoModel.countDocuments({
          user: businessInfo.user,
          status: "pending",
        });

        await KYCDocumentModel.findOneAndUpdate(
          { user: businessInfo.user },
          { businessInfoCount: pendingBusinessCount },
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

  private getEmptyRevenueStats() {
    return {
      metrics: { mtd: 0, ytd: 0, avgPerClient: 0, partnerPayouts: 0 },
      byCity: [],
      byCategory: [],
    };
  }
}
