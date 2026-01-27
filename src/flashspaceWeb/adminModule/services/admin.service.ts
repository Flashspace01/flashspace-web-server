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

            if (action === 'approve' && kyc.bookingId) {
                await BookingModel.findByIdAndUpdate(kyc.bookingId, {
                    kycStatus: 'approved',
                    status: 'active'
                });
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
}
