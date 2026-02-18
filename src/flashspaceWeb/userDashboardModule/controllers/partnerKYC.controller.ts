import { Request, Response } from "express";
import { Types } from "mongoose";
import { PartnerKYCModel } from "../models/partnerKYC.model";
import { KYCDocumentModel } from "../models/kyc.model";

// Add a new partner
export const addPartner = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      profileId,
      fullName,
      email,
      phone,
      panNumber,
      aadhaarNumber,
      dob,
      address,
    } = req.body;

    if (!profileId || !fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (profileId, fullName, email, phone)",
      });
    }

    // Verify KYC Profile exists and belongs to user
    const kycProfile = await KYCDocumentModel.findOne({
      _id: profileId,
      user: userId,
    });

    if (!kycProfile) {
      return res.status(404).json({
        success: false,
        message: "KYC details not found",
      });
    }

    // Create Partner
    const partner = await PartnerKYCModel.create({
      user: userId,
      kycProfile: profileId,
      fullName,
      email,
      phone,
      panNumber,
      aadhaarNumber,
      dob,
      address,
    });

    if (!partner) {
      return res.status(500).json({
        success: false,
        message: "Failed to create partner",
      });
    }

    // Recalculate partnerCount in KYC Profile
    const pendingPartnerCount = await PartnerKYCModel.countDocuments({
      user: userId,
      status: "pending",
    });

    kycProfile.partnerCount = pendingPartnerCount;
    await kycProfile.save();

    res.status(201).json({
      success: true,
      message: "Partner added successfully",
      data: partner,
    });
  } catch (error) {
    console.error("Add partner error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add partner",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get all partners for a KYC profile

// Remove a partner
export const removePartner = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const partnerId = req.params.partnerId as string;

    if (!Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Partner ID",
      });
    }

    const partner = await PartnerKYCModel.findOne({
      _id: partnerId,
      user: userId,
      isDeleted: false,
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    // Soft delete
    partner.isDeleted = true;
    await partner.save();

    // Decrement partnerCount
    const kycProfile = await KYCDocumentModel.findOne({
      _id: partner.kycProfile,
    });

    if (kycProfile) {
      kycProfile.partnerCount = Math.max((kycProfile.partnerCount || 1) - 1, 0);
      await kycProfile.save();
    }

    res.status(200).json({
      success: true,
      message: "Partner removed successfully",
    });
  } catch (error) {
    console.error("Remove partner error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove partner",
    });
  }
};

// Get details of a specific partner
export const getPartners = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { profileId } = req.params;

    console.log(`[getPartners] User: ${userId}, MainProfile: ${profileId}`);

    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: "Profile ID required",
      });
    }

    // Correctly query PartnerKYCModel for partners linked to this profile
    const partners = await PartnerKYCModel.find({
      user: userId,
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });

    console.log(`[getPartners] Found ${partners.length} partners`);

    res.status(200).json({
      success: true,
      data: partners,
    });
  } catch (error: any) {
    console.error("Get partners error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch partners",
      error: error.message,
    });
  }
};

// Get details of a specific partner
export const getPartnerDetails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const partnerId = req.params.partnerId as string;

    if (!Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Partner ID",
      });
    }

    const partner = await PartnerKYCModel.findOne({
      _id: partnerId,
      user: userId,
      isDeleted: false,
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    res.status(200).json({
      success: true,
      data: partner,
    });
  } catch (error) {
    console.error("Get partner details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch partner details",
    });
  }
};
