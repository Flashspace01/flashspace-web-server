import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import {
  SpaceUserKycModel,
  KycDecisionStatus,
} from "../models/spaceUserKyc.model";
import { getFileUrl as getMulterFileUrl } from "../../userDashboardModule/config/multer.config";
import { PropertyModel } from "../../propertyModule/property.model";
import { CoworkingSpaceModel } from "../../coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../../virtualOfficeModule/virtualOffice.model";
import { MeetingRoomModel } from "../../meetingRoomModule/meetingRoom.model";
import { SpaceApprovalStatus } from "../../shared/enums/spaceApproval.enum";
import { UserModel } from "../../authModule/models/user.model";
import { checkAndAdvanceSpaceStatus } from "../../shared/utils/spaceOnboarding.utils";
import { NotificationService } from "../../notificationModule/services/notification.service";
import { NotificationType } from "../../notificationModule/models/Notification";

// Helper to get the effective partner ID (handles team members)
const getEffectivePartnerId = async (userId: string): Promise<string> => {
  const user = await UserModel.findById(userId);
  if (user?.isTeamMember && user.parentPartnerId) {
    return user.parentPartnerId.toString();
  }
  return userId;
};

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

    const partnerId = await getEffectivePartnerId(userId);

    const {
      companyName,
      companyType,
      industry,
      gstNumber,
      cinRegistrationNumber,
      registeredAddress,
      contactPhone,
      companyPartners,
      panNumber,
    } = req.body;

    // Find the first property to save these details
    let property = await PropertyModel.findOne({ partner: partnerId });
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "[DEBUG-404] No property found for this user. Business details must be linked to a property. Please add a space first.",
      });
    }

    if (companyName !== undefined) property.companyName = companyName;
    if (gstNumber !== undefined) property.gstNumber = gstNumber;
    if (panNumber !== undefined) property.panNumber = panNumber;
    if (registeredAddress !== undefined)
      property.registeredAddress = registeredAddress;
    if (contactPhone !== undefined) property.contactPhone = contactPhone;
    
    await property.save();

    return res.status(200).json({
      success: true,
      message: "Business information saved successfully",
      data: property,
    });
  } catch (error) {
    console.error("[spaceKYC] upsertSpaceUserKycBusinessInfo error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save business information",
    });
  }
};

// Create or update space user KYC bank information
export const upsertSpaceUserKycBankInfo = async (
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

    const partnerId = await getEffectivePartnerId(userId);

    const {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      branch,
      accountType,
    } = req.body;

    // Find the first property to save these details
    let property = await PropertyModel.findOne({ partner: partnerId });
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "No property found to associate these details with.",
      });
    }

    if (accountHolderName !== undefined) property.accountHolderName = accountHolderName;
    if (bankName !== undefined) property.bankName = bankName;
    if (accountNumber !== undefined) property.accountNumber = accountNumber;
    if (ifscCode !== undefined) property.ifscCode = ifscCode;
    if (branch !== undefined) property.branch = branch;
    if (accountType !== undefined) property.accountType = accountType;

    await property.save();

    return res.status(200).json({
      success: true,
      message: "Bank information saved successfully",
      data: property,
    });
  } catch (error) {
    console.error("[spaceKYC] upsertSpaceUserKycBankInfo error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save bank information",
    });
  }
};
// Get all space partner KYC records (admin)
export const getAllSpacePartnerKyc = async (req: any, res: any) => {
  try {
    // Only show pending KYC requests to admin
    const kycs = await SpaceUserKycModel.find({
      overallStatus: { $ne: "not_started" },
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


// Get current authenticated space user's KYC record
export const getMySpaceUserKyc = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: user not found" });
    }

    const partnerId = await getEffectivePartnerId(userId);
    const partnerUser = await UserModel.findById(partnerId);

    let kyc = await SpaceUserKycModel.findOne({ userId: partnerId });
    const firstProperty = await PropertyModel.findOne({ partner: partnerId });

    const kycObject = (kyc ? kyc.toObject() : {}) as any;
    
    // Construct the data object:
    // 1. Business & Bank details from Property take precedence
    // 2. Personal info from User takes precedence
    // 3. Status from SpaceUserKyc
    
    const data = {
      ...kycObject,
      userId: userId,
      overallStatus: kycObject.overallStatus ?? "not_started",
      kycStatus: kycObject.kycStatus ?? "not_started",

      // Basic Info from User/Property
      fullName: partnerUser?.fullName || kycObject.fullName || "",
      email: partnerUser?.email || kycObject.email || "",
      phoneNumber: partnerUser?.phoneNumber || kycObject.phoneNumber || "",

      // Ensure Property fields take precedence
      companyName: firstProperty?.companyName || firstProperty?.name || kycObject.companyName || "",
      gstNumber: firstProperty?.gstNumber || kycObject.gstNumber || "",
      panNumber: firstProperty?.panNumber || kycObject.panNumber || "",
      registeredAddress: firstProperty?.registeredAddress || firstProperty?.address || kycObject.registeredAddress || "",
      contactPhone: firstProperty?.contactPhone || partnerUser?.phoneNumber || kycObject.contactPhone || "",
      accountHolderName: firstProperty?.accountHolderName || kycObject.accountHolderName || "",
      bankName: firstProperty?.bankName || kycObject.bankName || "",
      accountNumber: firstProperty?.accountNumber || kycObject.accountNumber || "",
      ifscCode: firstProperty?.ifscCode || kycObject.ifscCode || "",
      branch: firstProperty?.branch || kycObject.branch || "",
      accountType: firstProperty?.accountType || kycObject.accountType || "Current Account",
    };

    return res.status(200).json({
      success: true,
      message: "KYC record fetched successfully",
      data: data,
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

    const partnerId = await getEffectivePartnerId(userId);

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

    let kyc = await SpaceUserKycModel.findOne({ userId: partnerId });
    if (!kyc) {
      kyc = new SpaceUserKycModel({
        userId: partnerId,
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

    // Whenever personal info changes, we reset status to not_started if it was rejected
    if (kyc.overallStatus === "rejected") {
      kyc.overallStatus = "not_started";
      kyc.kycStatus = "not_started";
      kyc.overallRejectMessage = undefined;
    }

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

    const partnerId = await getEffectivePartnerId(userId);
    let kyc = await SpaceUserKycModel.findOne({ userId: partnerId });
    const user = await UserModel.findById(partnerId);

    if (!kyc) {
      // Auto-create a skeleton KYC record if it doesn't exist during upload
      kyc = new SpaceUserKycModel({
        userId: partnerId,
        fullName: user?.fullName || "Partner",
        email: user?.email || "",
        phoneNumber: user?.phoneNumber || "",
        dateOfBirth: new Date(),
        aadhaarNumber: "DRAFT",
        panNumber: "DRAFT"
      });
      await kyc.save();
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
    } else if (documentType === "company_registration") {
      deleteOldFile(kyc.companyRegistrationUrl, false);
      kyc.companyRegistrationUrl = fileUrl;
      kyc.companyRegistrationStatus = "pending";
      kyc.companyRegistrationRejectMessage = undefined;
    } else if (documentType === "gst_certificate") {
      deleteOldFile(kyc.gstCertificateUrl, false);
      kyc.gstCertificateUrl = fileUrl;
      kyc.gstCertificateStatus = "pending";
      kyc.gstCertificateRejectMessage = undefined;
    } else if (documentType === "address_proof") {
      deleteOldFile(kyc.addressProofUrl, false);
      kyc.addressProofUrl = fileUrl;
      kyc.addressProofStatus = "pending";
      kyc.addressProofRejectMessage = undefined;
    } else if (documentType === "bank_details_proof") {
      deleteOldFile(kyc.bankDetailsProofUrl, false);
      kyc.bankDetailsProofUrl = fileUrl;
      kyc.bankDetailsProofStatus = "pending";
      kyc.bankDetailsProofRejectMessage = undefined;
    } else if (documentType === "signed_agreement") {
      deleteOldFile(kyc.signedAgreementUrl, false);
      kyc.signedAgreementUrl = fileUrl;
      kyc.signedAgreementStatus = "pending";
      kyc.signedAgreementRejectMessage = undefined;
    } else if (documentType === "draft_agreement") {
      deleteOldFile(kyc.draftAgreementUrl, false);
      kyc.draftAgreementUrl = fileUrl;
      kyc.draftAgreementStatus = "approved"; // Draft is usually approved by admin/partner
      kyc.draftAgreementRejectMessage = undefined;
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Invalid documentType. Use 'aadhaar_image', 'pan_image', 'video_kyc', 'company_registration', 'gst_certificate', 'address_proof' or 'bank_details_proof'",
      });
    }

    await kyc.save();

    // Trigger Notifications
    try {
      if (documentType === "signed_agreement") {
        // Notify Partner/Admin that a user has uploaded a signed agreement
        await NotificationService.notifyAdmin(
          "Signed Agreement Uploaded",
          `Partner ${user?.fullName || partnerId} has uploaded a signed agreement for review.`,
          NotificationType.INFO,
          { userId: partnerId, kycId: kyc._id, documentType }
        );
      } else if (documentType === "draft_agreement") {
        // Notify User that a draft agreement is ready
        await NotificationService.notifyUser(
          partnerId,
          "Draft Agreement Ready",
          "A draft agreement has been uploaded for your booking. Please review, sign, and upload it back.",
          NotificationType.SUCCESS,
          { kycId: kyc._id, documentType }
        );
      } else {
        // General KYC doc upload notification to Admin
        await NotificationService.notifyAdmin(
          "KYC Document Uploaded",
          `Partner ${user?.fullName || partnerId} uploaded ${documentType.replace(/_/g, ' ')}.`,
          NotificationType.INFO,
          { userId: partnerId, kycId: kyc._id, documentType }
        );
      }
    } catch (notifErr) {
      console.error("[spaceKYC] Notification failed during upload:", notifErr);
    }

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
    } else if (documentType === "company_registration") {
      kyc.companyRegistrationStatus = status;
      kyc.companyRegistrationRejectMessage =
        status === "rejected" ? rejectMessage : undefined;
    } else if (documentType === "gst_certificate") {
      kyc.gstCertificateStatus = status;
      kyc.gstCertificateRejectMessage =
        status === "rejected" ? rejectMessage : undefined;
    } else if (documentType === "address_proof") {
      kyc.addressProofStatus = status;
      kyc.addressProofRejectMessage =
        status === "rejected" ? rejectMessage : undefined;
    } else if (documentType === "bank_details_proof") {
      kyc.bankDetailsProofStatus = status;
      kyc.bankDetailsProofRejectMessage =
        status === "rejected" ? rejectMessage : undefined;
    } else if (documentType === "video_kyc") {
      kyc.videoKycStatus = status;
      kyc.videoKycRejectMessage =
        status === "rejected" ? rejectMessage : undefined;
    } else if (documentType === "signed_agreement") {
      kyc.signedAgreementStatus = status;
      kyc.signedAgreementRejectMessage =
        status === "rejected" ? rejectMessage : undefined;
    } else if (documentType === "draft_agreement") {
      kyc.draftAgreementStatus = status;
      kyc.draftAgreementRejectMessage =
        status === "rejected" ? rejectMessage : undefined;
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Invalid documentType. Use 'aadhaar_image', 'pan_image', 'video_kyc', 'company_registration', 'gst_certificate', 'address_proof' or 'bank_details_proof'",
      });
    }

    // If a document is rejected, the overall status should reflect that
    if (status === "rejected") {
      kyc.overallStatus = "rejected";
    }
    kyc.kycStatus = status;

    await kyc.save();

    // Trigger Notification to User about document status change
    try {
      const statusLabel = status === "approved" ? "Verified" : "Rejected";
      const iconType = status === "approved" ? NotificationType.SUCCESS : NotificationType.WARNING;
      const message = status === "approved" 
        ? `Your document (${documentType.replace(/_/g, ' ')}) has been verified successfully.`
        : `Your document (${documentType.replace(/_/g, ' ')}) was rejected. Reason: ${rejectMessage || 'Please re-upload a clear copy.'}`;

      await NotificationService.notifyUser(
        userId,
        `Document ${statusLabel}`,
        message,
        iconType,
        { kycId: kyc._id, documentType, status }
      );
    } catch (notifErr) {
      console.error("[spaceKYC] Notification failed during review:", notifErr);
    }

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

    // 1. ADDED: Validation to ensure all documents are approved before overall approval
    if (status === "approved") {
      const docsToHero = [
        { status: kyc.aadhaarImageStatus, label: "Aadhaar" },
        { status: kyc.panImageStatus, label: "PAN" },
      ];

      if (kyc.videoKycUrl) {
        docsToHero.push({ status: kyc.videoKycStatus, label: "Video KYC" });
      }

      const unapprovedDocs = docsToHero
        .filter((d) => d.status !== "approved")
        .map((d) => d.label);

      if (unapprovedDocs.length > 0) {
        return res.status(400).json({
          success: false,
          message: `All documents (${unapprovedDocs.join(", ")}) must be approved before overall KYC approval`,
        });
      }
    }

    kyc.overallStatus = status;
    kyc.kycStatus = status;
    kyc.overallRejectMessage =
      status === "rejected" ? rejectMessage : undefined;

    await kyc.save();

    if (status === "approved") {
      const properties = await PropertyModel.find({ partner: userId }).select(
        "_id",
      );
      await Promise.all(
        properties.map((property) =>
          checkAndAdvanceSpaceStatus(userId, property._id.toString()),
        ),
      );
    }

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

    const partnerId = await getEffectivePartnerId(userId);
    const kyc = await SpaceUserKycModel.findOne({ userId: partnerId });
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
    kyc.kycStatus = "pending";
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



export const getSpacePartnerPropertiesByKycId = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const kyc = await SpaceUserKycModel.findById(id);
    if (!kyc) {
      return res
        .status(404)
        .json({ success: false, message: "KYC record not found" });
    }

    const userId = kyc.userId;

    const properties = await PropertyModel.find({
      partner: userId,
    });

    return res.status(200).json({
      success: true,
      message: "Properties retrieved successfully",
      data: properties,
    });
  } catch (error) {
    console.error("[spaceKYC] getSpacePartnerPropertiesByKycId error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
    });
  }
};
export const getSpacePartnerPropertiesByUserId = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = req.params;

    const properties = await PropertyModel.find({
      partner: userId,
      isDeleted: false,
      kycStatus: { $ne: "not_started" },
    }).lean();

    const propertiesWithStatus = await Promise.all(
      properties.map(async (prop: any) => {
        const [vo, coworking, meeting] = await Promise.all([
          VirtualOfficeModel.findOne({
            property: prop._id,
            approvalStatus: SpaceApprovalStatus.PENDING_ADMIN,
          }),
          CoworkingSpaceModel.findOne({
            property: prop._id,
            approvalStatus: SpaceApprovalStatus.PENDING_ADMIN,
          }),
          MeetingRoomModel.findOne({
            property: prop._id,
            approvalStatus: SpaceApprovalStatus.PENDING_ADMIN,
          }),
        ]);

        return {
          ...prop,
          voPending: !!vo,
          coworkingPending: !!coworking,
          meetingPending: !!meeting,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      message: "Properties retrieved successfully",
      data: propertiesWithStatus,
    });
  } catch (error) {
    console.error("[spaceKYC] getSpacePartnerPropertiesByUserId error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
    });
  }
};
