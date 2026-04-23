import { KYCDocumentModel } from "../../userDashboardModule/models/kyc.model";
import { PropertyModel, KYCStatus } from "../../propertyModule/property.model";

export const assertPartnerCanActivateSpace = async (
  partnerId: string,
  propertyId: string,
) => {
  const partnerKyc = await KYCDocumentModel.findOne({ user: partnerId }).sort({
    createdAt: -1,
  });

  if (!partnerKyc || partnerKyc.overallStatus !== "approved") {
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
