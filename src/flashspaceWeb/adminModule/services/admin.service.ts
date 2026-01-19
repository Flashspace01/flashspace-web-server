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

    // Approve KYC profile
    async approveKYC(profileId: string, adminId: string): Promise<ApiResponse<any>> {
        try {
            // Find the KYC profile
            const kycProfile = await KYCDocumentModel.findById(profileId).populate('user');

            if (!kycProfile) {
                return {
                    success: false,
                    message: "KYC profile not found"
                };
            }

            // Update profile status
            kycProfile.overallStatus = "approved";
            kycProfile.updatedAt = new Date();

            // Mark all documents as approved
            if (kycProfile.documents) {
                kycProfile.documents.forEach((doc: any) => {
                    doc.status = "approved";
                    doc.verifiedAt = new Date();
                    doc.verifiedBy = adminId;
                });
            }

            await kycProfile.save();

            // Update user's kycVerified flag
            const userId = typeof kycProfile.user === 'object' ? (kycProfile.user as any)._id : kycProfile.user;
            await UserModel.findByIdAndUpdate(userId, { kycVerified: true });

            // Find and auto-link any pending bookings for this user
            const pendingBookings = await BookingModel.find({
                user: userId,
                status: "pending_kyc",
                isDeleted: false
            });

            // Link all pending bookings to this approved profile
            for (const booking of pendingBookings) {
                booking.kycProfileId = profileId;
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

                // Add booking to profile's linkedBookings
                if (!kycProfile.linkedBookings?.includes(booking._id.toString())) {
                    kycProfile.linkedBookings = kycProfile.linkedBookings || [];
                    kycProfile.linkedBookings.push(booking._id.toString());
                }
            }

            // Save profile with linked bookings
            await kycProfile.save();

            return {
                success: true,
                message: `KYC profile approved successfully. ${pendingBookings.length} booking(s) activated.`,
                data: {
                    profile: kycProfile,
                    linkedBookings: pendingBookings.length
                }
            };
        } catch (error: any) {
            console.error("Error approving KYC:", error);
            return {
                success: false,
                message: "Failed to approve KYC",
                error: error.message
            };
        }
    }
}
