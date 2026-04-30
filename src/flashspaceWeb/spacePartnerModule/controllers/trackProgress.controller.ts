import { Request, Response } from "express";
import mongoose from "mongoose";
import { BookingModel } from "../../bookingModule/booking.model";
import { PartnerKYCModel } from "../../userDashboardModule/models/partnerKYC.model";
import { UserModel } from "../../authModule/models/user.model";

// Helper to get the effective partner ID (handles team members)
const getEffectivePartnerId = async (userId: string): Promise<string> => {
  const user = await UserModel.findById(userId);
  if (user?.isTeamMember && user.parentPartnerId) {
    return user.parentPartnerId.toString();
  }
  return userId;
};

export const getPartnerTrackProgressData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const partnerId = await getEffectivePartnerId(userId);
    const partnerObjectId = new mongoose.Types.ObjectId(partnerId);
    
    console.log(`[TrackProgress] Fetching data for Partner: ${partnerId} (Requested by User: ${userId})`);

    // Fetch bookings only for this specific partner
    const bookings = await BookingModel.find({ 
      partner: partnerObjectId,
      isDeleted: { $ne: true }
    })
      .populate("user", "fullName kycVerified")
      .populate("kycProfile", "overallStatus")
      .sort({ createdAt: -1 })
      .lean();

    console.log(`[TrackProgress] Found ${bookings.length} bookings for partner ${partnerId}`);

    const userIds = bookings.map((b: any) => b.user?._id?.toString()).filter(Boolean);

    // Fetch all approved partner KYCs for these users AND this partner in one go
    const approvedPartnerKycs = await PartnerKYCModel.find({
      user: { $in: userIds },
      linkedUser: partnerId, // Explicitly filter by this partner
      status: "approved",
      isDeleted: { $ne: true }
    }).lean();

    console.log(`[TrackProgress] Found ${approvedPartnerKycs.length} approved partner KYC records`);

    const data = bookings.map((booking: any) => {
      const docs = booking.documents || [];
      
      const draftSubmitted = docs.some((doc: any) => doc.type === 'draft_agreement');
      const draftVerified = docs.some((doc: any) => 
        (doc.type === 'signed_agreement' || doc.type === 'agreement') && 
        doc.status === 'approved'
      );
      const supportingDocReceived = docs.some((doc: any) => 
        ['noc', 'utility_bill', 'electricity_bill', 'other_support', 'gst_certificate', 'pan_card'].includes(doc.type)
      );

      const agreementReceived = docs.some((doc: any) => doc.type === 'signed_agreement' || doc.type === 'agreement');

      // Partner KYC is approved if there's an approved PartnerKYC record linking this user and this partner
      const partnerKycApproved = approvedPartnerKycs.some(
        (pk: any) =>
          pk.user.toString() === booking.user?._id?.toString() &&
          pk.linkedUser?.toString() === partnerId
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

    return res.status(200).json({
      success: true,
      message: "Partner track progress data fetched successfully",
      data
    });
  } catch (error: any) {
    console.error("Error in getPartnerTrackProgressData:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch track progress data",
      error: error.message
    });
  }
};
