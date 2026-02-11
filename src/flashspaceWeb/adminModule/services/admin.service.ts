import { UserModel, AuthProvider, UserRole } from "../../authModule/models/user.model";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { KYCDocumentModel } from "../../userDashboardModule/models/kyc.model";
import { VirtualOfficeModel } from "../../virtualOfficeModule/virtualOffice.model";
import { CoworkingSpaceModel } from "../../coworkingSpaceModule/coworkingSpace.model";
import { ApiResponse } from "../../authModule/types/auth.types";
import { PasswordUtil } from "../../authModule/utils/password.util";

export class AdminService {

    /**
     * Helper to get all space IDs managed by a user (Partner or Space Manager)
     */
    private async getManagedSpaceIds(userId: string): Promise<string[]> {
        const [coworkingSpaces, virtualOffices] = await Promise.all([
            CoworkingSpaceModel.find({
                $or: [{ partner: userId }, { managers: userId }],
                isDeleted: false
            }, '_id'),
            VirtualOfficeModel.find({
                $or: [{ partner: userId }, { managers: userId }],
                isDeleted: false
            }, '_id')
        ]);

        return [
            ...coworkingSpaces.map(s => s._id.toString()),
            ...virtualOffices.map(s => s._id.toString())
        ];
    }

    // Get aggregated dashboard stats
    async getDashboardStats(user: any): Promise<ApiResponse<any>> {
        try {
            const isAdminOrSales = [UserRole.ADMIN, UserRole.SALES].includes(user.role);
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
                            recentActivity: []
                        }
                    };
                }
            }

            // 1. Total Users
            let totalUsers = 0;
            if (isAdminOrSales) {
                totalUsers = await UserModel.countDocuments({ isDeleted: false });
            } else {
                // For partners, count unique users who have booked their spaces
                const uniqueUsers = await BookingModel.distinct('user', {
                    spaceId: { $in: spaceIds },
                    isDeleted: false
                });
                totalUsers = uniqueUsers.length;
            }

            // 2. Active Bookings
            const bookingQuery: any = {
                status: { $in: ['active', 'pending_kyc'] },
                isDeleted: false
            };
            if (!isAdminOrSales) {
                bookingQuery.spaceId = { $in: spaceIds };
            }
            const totalBookings = await BookingModel.countDocuments(bookingQuery);

            // 3. Active Listings
            let activeListings = 0;
            if (isAdminOrSales) {
                const [voCount, csCount] = await Promise.all([
                    VirtualOfficeModel.countDocuments({ isActive: true, isDeleted: false }),
                    CoworkingSpaceModel.countDocuments({ isActive: true, isDeleted: false })
                ]);
                activeListings = voCount + csCount;
            } else {
                activeListings = spaceIds.length; // Simply the count of spaces they manage
            }

            // 4. Total Revenue
            const revenueMatch: any = {
                status: { $in: ['active', 'pending_kyc'] },
                isDeleted: false
            };
            if (!isAdminOrSales) {
                revenueMatch.spaceId = { $in: spaceIds };
            }

            const revenueAggregation = await BookingModel.aggregate([
                { $match: revenueMatch },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$plan.price" }
                    }
                }
            ]);
            const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

            // 5. Recent Activity
            let recentActivity: any[] = [];

            if (isAdminOrSales) {
                const recentUsers = await UserModel.find({ isDeleted: false })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('fullName email createdAt');

                recentActivity = recentUsers.map(u => ({
                    id: u._id,
                    type: 'user_joined',
                    message: `New user joined: ${u.fullName}`,
                    time: u.createdAt
                }));
            } else {
                // Partners see recent bookings
                const recentBookings = await BookingModel.find({
                    spaceId: { $in: spaceIds },
                    isDeleted: false
                })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate('user', 'fullName');

                recentActivity = recentBookings.map(b => ({
                    id: b._id,
                    type: 'new_booking',
                    message: `New booking link for ${(b.user as any)?.fullName || 'User'}`,
                    time: b.createdAt
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
                    recentActivity
                }
            };
        } catch (error: any) {
            console.error("Error fetching admin stats:", error);
            return {
                success: false,
                message: "Failed to fetch admin stats",
                error: error.message
            };
        }
    }

    // Get all users (Admin only usually, but logic kept generic if needed)
    async getUsers(page: number = 1, limit: number = 10, search?: string, deleted: boolean = false): Promise<ApiResponse<any>> {
        try {
            const skip = (page - 1) * limit;
            const query: any = { isDeleted: deleted };

            if (search) {
                query.$or = [
                    { fullName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }

            const users = await UserModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-password');

            const total = await UserModel.countDocuments(query);

            return {
                success: true,
                message: "Users fetched successfully",
                data: {
                    users,
                    pagination: {
                        total,
                        page,
                        pages: Math.ceil(total / limit)
                    }
                }
            };
        } catch (error: any) {
            return {
                success: false,
                message: "Failed to fetch users",
                error: error.message
            };
        }
    }

    // Get pending KYC requests
    async getPendingKYC(user: any): Promise<ApiResponse<any>> {
        try {
            const isAdminOrSales = [UserRole.ADMIN, UserRole.SALES].includes(user.role);
            let bookingIds: string[] = [];

            // If partner, first find all bookings related to their spaces
            if (!isAdminOrSales) {
                const spaceIds = await this.getManagedSpaceIds(user.id);
                // Optimization: If no spaces, empty result
                if (spaceIds.length === 0) {
                    return { success: true, message: "Pending KYC fetched", data: [] };
                }

                const bookings = await BookingModel.find({
                    spaceId: { $in: spaceIds }
                }, '_id');
                bookingIds = bookings.map(b => b._id.toString());
            }

            const query: any = {
                overallStatus: { $in: ['pending', 'resubmit'] },
                isDeleted: false
            };

            // If partner, filter KYC docs by bookingId
            if (!isAdminOrSales) {
                query.bookingId = { $in: bookingIds };
            }

            const kycDocs = await KYCDocumentModel.find(query)
                .populate('user', 'fullName email phoneNumber')
                .populate('bookingId') // Populate booking to show which space/plan
                .sort({ updatedAt: -1 });

            return {
                success: true,
                message: "Pending KYC requests fetched successfully",
                data: kycDocs
            };
        } catch (error: any) {
            return {
                success: false,
                message: "Failed to fetch KYC requests",
                error: error.message
            };
        }
    }

    // Delete / Restore user
    async deleteUser(userId: string, restore: boolean = false): Promise<ApiResponse<any>> {
        try {
            const mongoose = require('mongoose');
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return { success: false, message: "Invalid user ID format" };
            }

            const user = await UserModel.findByIdAndUpdate(
                userId,
                { isDeleted: !restore, isActive: restore },
                { new: true }
            );

            if (!user) {
                return { success: false, message: "User not found" };
            }

            return {
                success: true,
                message: restore ? "User restored successfully" : "User moved to trash successfully"
            };
        } catch (error: any) {
            return { success: false, message: "Failed to update user status", error: error.message };
        }
    }

    // Get all bookings 
    async getAllBookings(user: any, page: number = 1, limit: number = 50): Promise<ApiResponse<any>> {
        try {
            const skip = (page - 1) * limit;
            const query: any = { isDeleted: false };

            const isAdminOrSales = [UserRole.ADMIN, UserRole.SALES].includes(user.role);

            if (!isAdminOrSales) {
                const spaceIds = await this.getManagedSpaceIds(user.id);
                if (spaceIds.length === 0) {
                    return {
                        success: true,
                        message: "Bookings fetched successfully",
                        data: {
                            bookings: [],
                            pagination: { total: 0, page, pages: 0 }
                        }
                    };
                }
                query.spaceId = { $in: spaceIds };
            }

            const bookings = await BookingModel.find(query)
                .populate('user', 'fullName email')
                .populate('spaceSnapshot', 'name city') // Helpful context
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
                        pages: Math.ceil(total / limit)
                    }
                }
            };
        } catch (error: any) {
            return {
                success: false,
                message: "Failed to fetch bookings",
                error: error.message
            };
        }
    }

    // Review KYC document
    async reviewKYC(kycId: string, action: 'approve' | 'reject', rejectionReason?: string): Promise<ApiResponse<any>> {
        try {
            const kyc = await KYCDocumentModel.findById(kycId);
            if (!kyc) return { success: false, message: "KYC document not found" };

            // Note: Ideally, check if this KYC belongs to a booking in a space managed by the partner.
            // For now, relying on controller RBAC. But safer to add check here too if critical.

            kyc.overallStatus = action === 'approve' ? 'approved' : 'rejected';

            if (kyc.documents) {
                kyc.documents.forEach(doc => {
                    doc.status = action === 'approve' ? 'approved' : 'rejected';
                    if (action === 'reject' && rejectionReason) doc.rejectionReason = rejectionReason;
                    doc.verifiedAt = new Date();
                });
            }

            kyc.progress = action === 'approve' ? 100 : 0;
            kyc.updatedAt = new Date();
            await kyc.save();

            // If approved, update the related bookings' KYC status
            if (action === 'approve' && kyc.linkedBookings && kyc.linkedBookings.length > 0) {
                for (const bookingId of kyc.linkedBookings) {
                    await BookingModel.findByIdAndUpdate(bookingId, {
                        kycStatus: 'approved',
                        status: 'active' // Move booking to active status
                    });
                }
            }

            return { success: true, message: `KYC ${action}ed successfully` };
        } catch (error: any) {
            return { success: false, message: "Failed to review KYC", error: error.message };
        }
    }

    // Create a new user
    async createUser(userData: any): Promise<ApiResponse<any>> {
        try {
            const { fullName, email, password, role } = userData;

            const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
            if (existingUser) return { success: false, message: "User with this email already exists" };

            const hashedPassword = await PasswordUtil.hash(password);

            const newUser = await UserModel.create({
                fullName,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: role || 'user',
                authProvider: AuthProvider.LOCAL,
                isEmailVerified: true,
                isActive: true,
                refreshTokens: []
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
                        createdAt: newUser.createdAt
                    }
                }
            };
        } catch (error: any) {
            console.error("Create user error:", error);
            return { success: false, message: "Failed to create user", error: error.message };
        }
    }
    // Update user details
    async updateUser(userId: string, updates: any): Promise<ApiResponse<any>> {
        try {
            const mongoose = require('mongoose');
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
                { new: true, runValidators: true }
            ).select('-password');

            if (!user) {
                return { success: false, message: "User not found" };
            }

            return {
                success: true,
                message: "User updated successfully",
                data: user
            };
        } catch (error: any) {
            console.error("Update user error:", error);
            // Handle duplicate email error
            if (error.code === 11000) {
                return { success: false, message: "Email already in use" };
            }
            return { success: false, message: "Failed to update user", error: error.message };
        }
    }
    // Get Revenue Dashboard Stats
    async getRevenueDashboard(user: any): Promise<ApiResponse<any>> {
        try {
            const isAdminOrSales = [UserRole.ADMIN, UserRole.SALES].includes(user.role);
            let spaceIds: string[] = [];
            let matchStage: any = {
                status: { $in: ['active', 'completed'] }, // Only counted revenue
                isDeleted: false
            };

            // If not admin, restrict to their spaces
            if (!isAdminOrSales) {
                spaceIds = await this.getManagedSpaceIds(user.id);
                if (spaceIds.length === 0) {
                    return { success: true, message: "No data", data: this.getEmptyRevenueStats() };
                }
                matchStage.spaceId = { $in: spaceIds };
            }

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfYear = new Date(now.getFullYear(), 0, 1);

            // 1. Key Metrics Aggregation
            const metrics = await BookingModel.aggregate([
                { $match: matchStage },
                {
                    $facet: {
                        totalRevenue: [{ $group: { _id: null, amount: { $sum: "$amount" } } }],
                        mtdRevenue: [
                            { $match: { createdAt: { $gte: startOfMonth } } },
                            { $group: { _id: null, amount: { $sum: "$amount" } } }
                        ],
                        ytdRevenue: [
                            { $match: { createdAt: { $gte: startOfYear } } },
                            { $group: { _id: null, amount: { $sum: "$amount" } } }
                        ],
                        uniqueClients: [{ $group: { _id: "$user" } }, { $count: "count" }]
                    }
                }
            ]);

            const mtd = metrics[0].mtdRevenue[0]?.amount || 0;
            const ytd = metrics[0].ytdRevenue[0]?.amount || 0;
            const total = metrics[0].totalRevenue[0]?.amount || 0;
            const clients = metrics[0].uniqueClients[0]?.count || 1; // Avoid div by 0
            const avgPerClient = Math.round(total / clients);

            // 2. Revenue by City
            const byCity = await BookingModel.aggregate([
                { $match: matchStage },
                {
                    $lookup: {
                        from: "spaces", // Polymorphic lookup difficult in agg, simplifying assumption or verify schema
                        localField: "spaceId",
                        foreignField: "_id",
                        as: "space"
                    }
                },
                // Note: Direct lookup on 'spaces' collection might fail if you have separate collections for Coworking/Virtual
                // For now, assuming basic aggregation or we might need to fetch and map if collections are split.
                // Alternative: Use 'spaceSnapshot' if available and reliable.
                { $group: { _id: "$spaceSnapshot.city", revenue: { $sum: "$amount" } } },
                { $sort: { revenue: -1 } },
                { $limit: 5 }
            ]);

            // 3. Revenue by Category
            const byCategory = await BookingModel.aggregate([
                { $match: matchStage },
                { $group: { _id: "$spaceType", revenue: { $sum: "$amount" }, bookings: { $sum: 1 } } }
            ]);

            // 4. Partner Payouts (Mock logic: 80% of revenue)
            // Real logic would join with Payouts collection
            const partnerPayouts = Math.round(total * 0.8);

            return {
                success: true,
                message: "Revenue dashboard fetched",
                data: {
                    metrics: {
                        mtd,
                        ytd,
                        avgPerClient,
                        partnerPayouts
                    },
                    byCity: byCity.map(c => ({ name: c._id || 'Unknown', revenue: c.revenue })),
                    byCategory: byCategory.map(c => ({ name: c._id, revenue: c.revenue, bookings: c.bookings })),
                    byPartner: [] // Implement if partner details are needed/available
                }
            };

        } catch (error: any) {
            console.error("Revenue dashboard error:", error);
            return { success: false, message: "Failed to fetch revenue stats", error: error.message };
        }
    }

    private getEmptyRevenueStats() {
        return {
            metrics: { mtd: 0, ytd: 0, avgPerClient: 0, partnerPayouts: 0 },
            byCity: [],
            byCategory: [],
            byPartner: []
        };
    }
}
