import { KYCDocumentModel } from "../../userDashboardModule/models/kyc.model";
import { PropertyModel, KYCStatus } from "../../propertyModule/property.model";
import { SpaceUserKycModel } from "../../spacePartnerModule/models/spaceUserKyc.model";

export const assertPartnerCanActivateSpace = async (
  partnerId: string,
  propertyId: string,
) => {
  const [spacePartnerKyc, legacyPartnerKyc] = await Promise.all([
    SpaceUserKycModel.findOne({ userId: partnerId }).sort({ createdAt: -1 }),
    KYCDocumentModel.findOne({ user: partnerId }).sort({ createdAt: -1 }),
  ]);

  const isPartnerApproved =
    spacePartnerKyc?.overallStatus === "approved" ||
    legacyPartnerKyc?.overallStatus === "approved";

  if (!isPartnerApproved) {
    throw new Error(
      "Personal KYC must be approved before activating this space.",
    );
  }

  const property = await PropertyModel.findById(propertyId).select(
    "kycStatus",
  );

  if (!property) {
    throw new Error("Property not found");
  }

  if (property.kycStatus !== KYCStatus.APPROVED) {
    throw new Error("Property KYC must be approved before activating this space.");
  }
};
