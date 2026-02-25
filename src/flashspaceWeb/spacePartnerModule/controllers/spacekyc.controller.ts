// Create or update space user KYC business information
export const upsertSpaceUserKycBusinessInfo = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: user not found" });
    }

    const {
      companyName,
      companyType,
      industry,
      gstNumber,
      cinRegistrationNumber,
      registeredAddress,
      companyPartners,
    } = req.body;

    // At least one business field must be present
    if (
      !companyName &&
      !companyType &&
      !industry &&
      !gstNumber &&
      !cinRegistrationNumber &&
      !registeredAddress &&
      !companyPartners
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one business information field is required",
      });
    }

    let kyc = await SpaceUserKycModel.findOne({ userId });
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message:
          "KYC record not found. Please submit personal information first.",
      });
    }

    if (companyName !== undefined) kyc.companyName = companyName;
    if (companyType !== undefined) kyc.companyType = companyType;
    if (industry !== undefined) kyc.industry = industry;
    if (gstNumber !== undefined) kyc.gstNumber = gstNumber;
    if (cinRegistrationNumber !== undefined)
      kyc.cinRegistrationNumber = cinRegistrationNumber;
    if (registeredAddress !== undefined)
      kyc.registeredAddress = registeredAddress;
    if (companyPartners !== undefined) kyc.companyPartners = companyPartners;

    // Whenever business info changes, we stay in not_started or rejected until explicit submission
    // kyc.overallStatus = "pending";
    // kyc.overallRejectMessage = undefined;

    await kyc.save();

    return res.status(200).json({
      success: true,
      message: "KYC business information saved successfully",
      data: kyc,
    });
  } catch (error) {
    console.error("[spaceKYC] upsertSpaceUserKycBusinessInfo error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save KYC business information",
    });
  }
};
// Get all space partner KYC records (admin)
export const getAllSpacePartnerKyc = async (req: any, res: any) => {
  try {
    // Only show pending KYC requests to admin
    const kycs = await SpaceUserKycModel.find({
      overallStatus: "pending",
    }).populate("userId", "fullName email phoneNumber");
    res.json({ success: true, data: kycs });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch space partner KYC records",
      error: err.message,
    });
  }
};

// Get a single space partner KYC record by its id (admin)
export const getSpacePartnerKycById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const kyc = await SpaceUserKycModel.findById(id).populate(
      "userId",
      "fullName email phoneNumber",
    );
    if (!kyc) {
      return res
        .status(404)
        .json({ success: false, message: "KYC record not found" });
    }
    res.json({ success: true, data: kyc });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch KYC record",
      error: err.message,
    });
  }
};
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import {
  SpaceUserKycModel,
  KycDecisionStatus,
} from "../models/spaceUserKyc.model";
import { getFileUrl as getMulterFileUrl } from "../../userDashboardModule/config/multer.config";

// Get current authenticated space user's KYC record
export const getMySpaceUserKyc = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: user not found" });
    }

    const kyc = await SpaceUserKycModel.findOne({ userId });

    if (!kyc) {
      return res.status(200).json({
        success: true,
        message: "No KYC record found for user",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "KYC record fetched successfully",
      data: kyc,
    });
  } catch (error) {
    console.error("[spaceKYC] getMySpaceUserKyc error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch KYC record",
    });
  }
};

// Create or update space user KYC personal information
export const upsertSpaceUserKyc = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: user not found" });
    }

    const {
      fullName,
      email,
      phoneNumber,
      dateOfBirth,
      aadhaarNumber,
      panNumber,
    } = req.body;

    if (
      !fullName ||
      !email ||
      !phoneNumber ||
      !dateOfBirth ||
      !aadhaarNumber ||
      !panNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "fullName, email, phoneNumber, dateOfBirth, aadhaarNumber and panNumber are required",
      });
    }

    let kyc = await SpaceUserKycModel.findOne({ userId });
    if (!kyc) {
      kyc = new SpaceUserKycModel({
        userId,
        fullName,
        email,
        phoneNumber,
        dateOfBirth,
        aadhaarNumber,
        panNumber,
        // Defaults for statuses are handled by schema
      });
    } else {
      kyc.fullName = fullName;
      kyc.email = email;
      kyc.phoneNumber = phoneNumber;
      kyc.dateOfBirth = new Date(dateOfBirth);
      kyc.aadhaarNumber = aadhaarNumber;
      kyc.panNumber = panNumber;
    }

    // Whenever personal info changes, we stay in not_started or rejected until explicit submission
    // kyc.overallStatus = "pending";
    // kyc.overallRejectMessage = undefined;

    await kyc.save();

    return res.status(200).json({
      success: true,
      message: "KYC personal information saved successfully",
      data: kyc,
    });
  } catch (error) {
    console.error("[spaceKYC] upsertSpaceUserKyc error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save KYC personal information",
    });
  }
};

// Upload Aadhaar image, PAN image or Video KYC file
// Expects Multer to have attached req.file and `documentType` in body:
// documentType: "aadhaar_image" | "pan_image" | "video_kyc"
export const uploadSpaceUserKycFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    const { documentType } = req.body as { documentType?: string };
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: user not found" });
    }

    if (!documentType) {
      return res
        .status(400)
        .json({ success: false, message: "documentType is required" });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded (check size/type)",
      });
    }

    let kyc = await SpaceUserKycModel.findOne({ userId });
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message:
          "KYC record not found. Please submit personal information first.",
      });
    }

    // Build public URL using existing helper (reuses uploads/kyc-documents & uploads/video-kyc)
    const fileUrl = getMulterFileUrl(file.filename, documentType);

    // If replacing an existing file, attempt to delete the old one
    const deleteOldFile = (existingUrl?: string, isVideo?: boolean) => {
      if (!existingUrl) return;
      try {
        const filename = existingUrl.split("/").pop();
        if (!filename) return;
        const subDir = isVideo ? "video-kyc" : "kyc-documents";
        const uploadsDir = path.join(__dirname, "../../../../uploads", subDir);
        const fullPath = path.join(uploadsDir, filename);
        if (fs.existsSync(fullPath)) {
          fs.unlink(fullPath, (err) => {
            if (err)
              console.error("[spaceKYC] Failed to delete old file:", err);
          });
        }
      } catch (err) {
        console.error("[spaceKYC] deleteOldFile error:", err);
      }
    };

    if (documentType === "aadhaar_image") {
      deleteOldFile(kyc.aadhaarImageUrl, false);
      kyc.aadhaarImageUrl = fileUrl;
      kyc.aadhaarImageStatus = "pending";
      kyc.aadhaarImageRejectMessage = undefined;
    } else if (documentType === "pan_image") {
      deleteOldFile(kyc.panImageUrl, false);
      kyc.panImageUrl = fileUrl;
      kyc.panImageStatus = "pending";
      kyc.panImageRejectMessage = undefined;
    } else if (documentType === "video_kyc") {
      deleteOldFile(kyc.videoKycUrl, true);
      kyc.videoKycUrl = fileUrl;
      kyc.videoKycStatus = "pending";
      kyc.videoKycRejectMessage = undefined;
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Invalid documentType. Use 'aadhaar_image', 'pan_image', or 'video_kyc'",
      });
    }

    await kyc.save();

    return res.status(201).json({
      success: true,
      message: "KYC document uploaded successfully",
      data: kyc,
    });
  } catch (error) {
    console.error("[spaceKYC] uploadSpaceUserKycFile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload KYC document",
    });
  }
};

// Review a specific document: accept or reject with optional message
// body: { userId, documentType, status, rejectMessage? }
export const reviewSpaceUserKycDocument = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId, documentType, status, rejectMessage } = req.body as {
      userId?: string;
      documentType?: string;
      status?: KycDecisionStatus;
      rejectMessage?: string;
    };

    if (!userId || !documentType || !status) {
      return res.status(400).json({
        success: false,
        message: "userId, documentType and status are required",
      });
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use 'pending', 'approved' or 'rejected'",
      });
    }

    const kyc = await SpaceUserKycModel.findOne({ userId });
    if (!kyc) {
      return res
        .status(404)
        .json({ success: false, message: "KYC record not found" });
    }

    if (documentType === "aadhaar_image") {
      kyc.aadhaarImageStatus = status;
      kyc.aadhaarImageRejectMessage =
        status === "rejected" ? rejectMessage : undefined;
    } else if (documentType === "pan_image") {
      kyc.panImageStatus = status;
      kyc.panImageRejectMessage =
        status === "rejected" ? rejectMessage : undefined;
    } else if (documentType === "video_kyc") {
      kyc.videoKycStatus = status;
      kyc.videoKycRejectMessage =
        status === "rejected" ? rejectMessage : undefined;
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Invalid documentType. Use 'aadhaar_image', 'pan_image', or 'video_kyc'",
      });
    }

    await kyc.save();

    return res.status(200).json({
      success: true,
      message: "Document review status updated",
      data: kyc,
    });
  } catch (error) {
    console.error("[spaceKYC] reviewSpaceUserKycDocument error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update document review status",
    });
  }
};

// Review overall KYC: accept or reject all details after everything is uploaded
// body: { userId, status, rejectMessage? }
export const reviewSpaceUserKycOverall = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId, status, rejectMessage } = req.body as {
      userId?: string;
      status?: KycDecisionStatus;
      rejectMessage?: string;
    };

    if (!userId || !status) {
      return res.status(400).json({
        success: false,
        message: "userId and status are required",
      });
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use 'pending', 'approved' or 'rejected'",
      });
    }

    const kyc = await SpaceUserKycModel.findOne({ userId });
    if (!kyc) {
      return res
        .status(404)
        .json({ success: false, message: "KYC record not found" });
    }

    kyc.overallStatus = status;
    kyc.overallRejectMessage =
      status === "rejected" ? rejectMessage : undefined;

    await kyc.save();

    return res.status(200).json({
      success: true,
      message: "Overall KYC status updated",
      data: kyc,
    });
  } catch (error) {
    console.error("[spaceKYC] reviewSpaceUserKycOverall error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update overall KYC status",
    });
  }
};

// Submit KYC for review: moves draft to pending
export const submitSpaceUserKyc = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: user not found" });
    }

    const kyc = await SpaceUserKycModel.findOne({ userId });
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found. Please fill in details first.",
      });
    }

    // Check if it's already approved
    if (kyc.overallStatus === "approved") {
      return res.status(400).json({
        success: false,
        message: "KYC is already approved",
      });
    }

    // Move to pending
    kyc.overallStatus = "pending";
    kyc.overallRejectMessage = undefined;

    await kyc.save();

    return res.status(200).json({
      success: true,
      message: "KYC submitted for review successfully",
      data: kyc,
    });
  } catch (error) {
    console.error("[spaceKYC] submitSpaceUserKyc error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit KYC for review",
    });
  }
};
