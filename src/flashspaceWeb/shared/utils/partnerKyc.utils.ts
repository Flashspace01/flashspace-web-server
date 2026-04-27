import { KYCDocumentModel } from "../../userDashboardModule/models/kyc.model";
import { SpaceUserKycModel } from "../../spacePartnerModule/models/spaceUserKyc.model";

export const getPartnerKycStatus = async (partnerId: string) => {
  const [spacePartnerKyc, legacyPartnerKyc] = await Promise.all([
    SpaceUserKycModel.findOne({ userId: partnerId }).sort({ createdAt: -1 }),
    KYCDocumentModel.findOne({ user: partnerId }).sort({ createdAt: -1 }),
  ]);

  const isApproved =
    spacePartnerKyc?.overallStatus === "approved" ||
    spacePartnerKyc?.kycStatus === "approved" ||
    legacyPartnerKyc?.overallStatus === "approved";

  const status = isApproved
    ? "approved"
    : spacePartnerKyc?.overallStatus ||
      spacePartnerKyc?.kycStatus ||
      legacyPartnerKyc?.overallStatus ||
      "not_started";

  return {
    status,
    isApproved,
    spacePartnerKyc,
    legacyPartnerKyc,
  };
};

export const assertPartnerKycApproved = async (partnerId: string) => {
  const { isApproved } = await getPartnerKycStatus(partnerId);

  if (!isApproved) {
    throw new Error(
      "Personal KYC must be approved before adding a new space.",
    );
  }
};
