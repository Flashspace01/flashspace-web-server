import { PropertyModel, KYCStatus } from "../../propertyModule/property.model";
import { getPartnerKycStatus } from "./partnerKyc.utils";

export const assertPartnerCanActivateSpace = async (
  partnerId: string,
  propertyId: string,
) => {
  const { isApproved: isPartnerApproved } =
    await getPartnerKycStatus(partnerId);

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
