import { UserModel } from "../../authModule/models/user.model";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { KYCDocumentModel } from "../../userDashboardModule/models/kyc.model";
import { VirtualOfficeModel } from "../../virtualOfficeModule/virtualOffice.model";
import { CoworkingSpaceModel } from "../../coworkingSpaceModule/coworkingSpace.model";
import { ApiResponse } from "../../authModule/types/auth.types"; // Assuming generic ApiResponse type exists or compatible structure

export class AdminService {

    // Get aggregated dashboard stats
    async getDashboardStats(): Promise<ApiResponse<any>> {
        try {
            // 1. Total Users
            const totalUsers = await UserModel.countDocuments({ isDeleted: false });

            // 2. Active Bookings
            const totalBookings = await BookingModel.countDocuments({
                status: { $in: ['active', 'pending_kyc'] },
                isDeleted: false
            });

            // 3. Active Listings (Virtual Offices + Coworking Spaces)
            const virtualOfficesCount = await VirtualOfficeModel.countDocuments({ isActive: true, isDeleted: false });
            const coworkingSpacesCount = await CoworkingSpaceModel.countDocuments({ isActive: true, isDeleted: false });
            const activeListings = virtualOfficesCount + coworkingSpacesCount;

            // 4. Total Revenue (Aggregation)
            // Summing up 'total' from paid invoices would be ideal, but for now we can sum booking prices if invoices aren't strictly linked yet
            // Or if we have an InvoiceModel, use that. Let's assume we estimate from active bookings for now or just return mocked/calculated 0 if no invoices.
            // Let's rely on BookingModel price for now as a rough estimate or 0.
            const revenueAggregation = await BookingModel.aggregate([
                { $match: { status: 'active', isDeleted: false } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$plan.price" }
                    }
                }
            ]);
            const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

            // 5. Recent Activity (Mocked or fetched from a dedicated ActivityLog model if it existed)
            // For now, we can fetch the most recent bookings or users as "activity"
            const recentUsers = await UserModel.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .limit(3)
                .select('fullName email createdAt');

            const recentActivity = recentUsers.map(user => ({
                id: user._id,
                type: 'user',
                message: `New user joined: ${user.fullName}`,
                time: user.createdAt
            }));

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

    // Get all users with pagination
    async getUsers(page: number = 1, limit: number = 10, search?: string): Promise<ApiResponse<any>> {
        try {
            const skip = (page - 1) * limit;
            const query: any = { isDeleted: false };

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
                .select('-password'); // Exclude sensitive data

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
    async getPendingKYC(): Promise<ApiResponse<any>> {
        try {
            // Find documents where overallStatus is pending or not_started but have uploaded docs
            const kycDocs = await KYCDocumentModel.find({
                overallStatus: { $in: ['pending', 'resubmit'] },
                isDeleted: false
            })
                .populate('user', 'fullName email phoneNumber')
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
}
