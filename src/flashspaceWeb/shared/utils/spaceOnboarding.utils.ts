import { KYCDocumentModel } from "../../userDashboardModule/models/kyc.model";
import { PropertyModel, KYCStatus } from "../../propertyModule/property.model";
import { SpaceUserKycModel } from "../../spacePartnerModule/models/spaceUserKyc.model";
import { VirtualOfficeModel } from "../../virtualOfficeModule/virtualOffice.model";
import { CoworkingSpaceModel } from "../../coworkingSpaceModule/coworkingSpace.model";
import { MeetingRoomModel } from "../../meetingRoomModule/meetingRoom.model";
import { SpaceApprovalStatus } from "../enums/spaceApproval.enum";

/**
 * Checks if a Partner's KYC and a specific Property's KYC are both approved.
 * If yes, advances any spaces linked to that property from PENDING_KYC to PENDING_ADMIN.
 */
export const checkAndAdvanceSpaceStatus = async (
  partnerId: string,
  propertyId: string,
) => {
  try {
    // 1. Check Partner KYC Status
    const [spacePartnerKyc, legacyPartnerKyc] = await Promise.all([
      SpaceUserKycModel.findOne({ userId: partnerId }).sort({ createdAt: -1 }),
      KYCDocumentModel.findOne({ user: partnerId }).sort({ createdAt: -1 }),
    ]);
    const isPartnerApproved =
      spacePartnerKyc?.overallStatus === "approved" ||
      legacyPartnerKyc?.overallStatus === "approved";

    // 2. Check Property KYC Status
    const property = await PropertyModel.findById(propertyId);
    const isPropertyApproved = property?.kycStatus === KYCStatus.APPROVED;

    // 3. If both are approved, advance spaces to PENDING_ADMIN
    if (isPartnerApproved && isPropertyApproved) {
      console.log(
        `[Onboarding] Partner ${partnerId} and Property ${propertyId} are approved. Advancing spaces to PENDING_ADMIN...`,
      );

      const updateData = { approvalStatus: SpaceApprovalStatus.PENDING_ADMIN };
      const query = {
        partner: partnerId,
        property: propertyId,
        approvalStatus: SpaceApprovalStatus.PENDING_KYC,
      };

      await VirtualOfficeModel.updateMany(query, updateData);
      await CoworkingSpaceModel.updateMany(query, updateData);
      await MeetingRoomModel.updateMany(query, updateData);

      console.log(
        `[Onboarding] Spaces for property ${propertyId} advanced successfully.`,
      );
    }
  } catch (error) {
    console.error("[Onboarding] Error in checkAndAdvanceSpaceStatus:", error);
  }
};
