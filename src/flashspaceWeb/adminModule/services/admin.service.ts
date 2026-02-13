import { UserModel } from "../../authModule/models/user.model";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { KYCDocumentModel } from "../../userDashboardModule/models/kyc.model";
import KycPartnerDocuments, { IKycPartnerDocuments } from "../../userDashboardModule/models/kycPartnerDocument.model";
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
            // Sum revenue from both 'active' and 'pending_kyc' bookings to match the active bookings count
            const revenueAggregation = await BookingModel.aggregate([
                { $match: { status: { $in: ['active', 'pending_kyc'] }, isDeleted: false } },
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

    // Get partner KYC snapshots (admin view)
    async getPartnerKYCList(userId?: string, profileId?: string): Promise<ApiResponse<IKycPartnerDocuments[]>> {
        try {
            const query: any = { isDeleted: false };

            if (userId) {
                const mongoose = require("mongoose");
                if (!mongoose.Types.ObjectId.isValid(userId)) {
                    return {
                        success: false,
                        message: "Invalid userId format",
                    };
                }
                query.user = userId;
            }

            if (profileId) {
                const mongoose = require("mongoose");
                if (!mongoose.Types.ObjectId.isValid(profileId)) {
                    return {
                        success: false,
                        message: "Invalid profileId format",
                    };
                }
                query.partnerProfileId = profileId;
            }

            const records = await KycPartnerDocuments.find(query).populate("user", "fullName email phoneNumber");

            return {
                success: true,
                message: "Partner KYC records fetched successfully",
                data: records,
            };
        } catch (error: any) {
            return {
                success: false,
                message: "Failed to fetch partner KYC records",
                error: error.message,
            };
        }
    }

    // Get single partner KYC snapshot by its ID
    async getPartnerKYCById(id: string): Promise<ApiResponse<IKycPartnerDocuments>> {
        try {
            const mongoose = require("mongoose");
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return {
                    success: false,
                    message: "Invalid partner KYC id format",
                };
            }

            const record = await KycPartnerDocuments.findById(id).populate("user", "fullName email phoneNumber");

            if (!record) {
                return {
                    success: false,
                    message: "Partner KYC record not found",
                };
            }

            return {
                success: true,
                message: "Partner KYC record fetched successfully",
                data: record,
            };
        } catch (error: any) {
            return {
                success: false,
                message: "Failed to fetch partner KYC record",
                error: error.message,
            };
        }
    }

    // Get single KYC by id
    async getKYCById(kycId: string): Promise<ApiResponse<any>> {
        try {
            const kyc = await KYCDocumentModel.findById(kycId)
                .populate('user', 'fullName email phoneNumber');

            if (!kyc) {
                return {
                    success: false,
                    message: "KYC document not found",
                };
            }

            return {
                success: true,
                message: "KYC document fetched successfully",
                data: kyc,
            };
        } catch (error: any) {
            return {
                success: false,
                message: "Failed to fetch KYC document",
                error: error.message,
            };
        }
    }

    // Delete / Restore user
    async deleteUser(userId: string, restore: boolean = false): Promise<ApiResponse<any>> {
        try {
            // Validate ObjectId format
            const mongoose = require('mongoose');
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return {
                    success: false,
                    message: "Invalid user ID format"
                };
            }

            const user = await UserModel.findByIdAndUpdate(
                userId,
                {
                    isDeleted: !restore,
                    isActive: restore
                },
                { new: true }
            );

            if (!user) {
                return {
                    success: false,
                    message: "User not found"
                };
            }

            return {
                success: true,
                message: restore ? "User restored successfully" : "User moved to trash successfully"
            };
        } catch (error: any) {
            return {
                success: false,
                message: "Failed to update user status",
                error: error.message
            };
        }
    }

    // Get all bookings with user and space details
    async getAllBookings(page: number = 1, limit: number = 50): Promise<ApiResponse<any>> {
        try {
            const skip = (page - 1) * limit;

            const bookings = await BookingModel.find({ isDeleted: false })
                .populate('user', 'fullName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await BookingModel.countDocuments({ isDeleted: false });

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

    // Review KYC document (approve/reject)
    async reviewKYC(kycId: string, action: 'approve' | 'reject', rejectionReason?: string): Promise<ApiResponse<any>> {
        try {
            const kyc = await KYCDocumentModel.findById(kycId);

            if (!kyc) {
                return {
                    success: false,
                    message: "KYC document not found"
                };
            }

            // Update overall status
            kyc.overallStatus = action === 'approve' ? 'approved' : 'rejected';

            // Update all individual documents
            if (kyc.documents) {
                kyc.documents.forEach(doc => {
                    doc.status = action === 'approve' ? 'approved' : 'rejected';
                    if (action === 'reject' && rejectionReason) {
                        doc.rejectionReason = rejectionReason;
                    }
                    doc.verifiedAt = new Date();
                });
            }

            // Update progress
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

            return {
                success: true,
                message: `KYC ${action}ed successfully`
            };
        } catch (error: any) {
            return {
                success: false,
                message: "Failed to review KYC",
                error: error.message
            };
        }
    }

    // Review single KYC document item (approve/reject at document level)
    async reviewKYCDocument(
        kycId: string,
        documentId: string,
        action: 'approve' | 'reject',
        rejectionReason?: string
    ): Promise<ApiResponse<any>> {
        try {
            const kyc = await KYCDocumentModel.findById(kycId);

            if (!kyc) {
                return {
                    success: false,
                    message: "KYC document not found",
                };
            }

            if (!kyc.documents || kyc.documents.length === 0) {
                return {
                    success: false,
                    message: "No documents found on this KYC record",
                };
            }

            const doc: any = kyc.documents.id(documentId);

            if (!doc) {
                return {
                    success: false,
                    message: "Document not found",
                };
            }

            doc.status = action === 'approve' ? 'approved' : 'rejected';
            if (action === 'reject' && rejectionReason) {
                doc.rejectionReason = rejectionReason;
            }
            doc.verifiedAt = new Date();

            // Recalculate simple progress based on approved documents
            const totalDocs = kyc.documents.length;
            const approvedDocs = kyc.documents.filter((d: any) => d.status === 'approved').length;
            kyc.progress = totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0;

            // Do not change overallStatus here; leave it for full KYC review endpoint
            await kyc.save();

            return {
                success: true,
                message: `Document ${action}ed successfully`,
                data: kyc,
            };
        } catch (error: any) {
            return {
                success: false,
                message: "Failed to review KYC document",
                error: error.message,
            };
        }
    }
}
