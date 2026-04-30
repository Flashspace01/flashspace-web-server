import { Router } from "express";
import { requireSpacePartner } from "../middleware/spacePartner.middleware";
import * as spaceController from "../controllers/space.controller";
import * as spaceKycController from "../controllers/spacekyc.controller";
import {
  setSpaceDetails,
  getAllSpaceDetails,
  acceptSpaceDetails,
  rejectSpaceDetails,
} from "../controllers/spaceDetails.controller";
import {
  createTeamMember,
  deleteTeamMember,
  getTeamMembers,
} from "../controllers/teamMember.controller";
import { getPartnerTrackProgressData } from "../controllers/trackProgress.controller";

import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { uploadKYCFile } from "../../userDashboardModule/config/multer.config";

console.log("[DEBUG] spacePartner.routes.ts is being loaded...");
export const spacePartnerRoutes = Router();
console.log("[DEBUG] spacePartnerRoutes instance created.");

// Base middleware for all space partner routes
spacePartnerRoutes.use(AuthMiddleware.authenticate);
// spacePartnerRoutes.use(requireSpacePartner);

spacePartnerRoutes.get("/test", (req, res) => {
  res.json({ success: true, message: "Space Partner routes are working" });
});

// Track Progress route
spacePartnerRoutes.get("/track-progress", (req, res, next) => {
  console.log("[DEBUG] Request received at /api/spacePartner/track-progress");
  next();
}, getPartnerTrackProgressData);

// Accept/reject space details (admin or reviewer)
spacePartnerRoutes.put("/space-details/:id/accept", acceptSpaceDetails);
spacePartnerRoutes.put("/space-details/:id/reject", rejectSpaceDetails);

// Space Details routes
spacePartnerRoutes.post("/space-details", setSpaceDetails);
spacePartnerRoutes.get("/space-details", getAllSpaceDetails);

// Space management routes
spacePartnerRoutes.post("/spaces", spaceController.createSpace);
spacePartnerRoutes.get("/spaces", spaceController.getSpaces);
spacePartnerRoutes.get("/spaces/:id", spaceController.getSpaceById);
spacePartnerRoutes.put("/spaces/:id", spaceController.updateSpace);
spacePartnerRoutes.delete("/spaces/:id", spaceController.deleteSpace);

// Partner invoice-payment routes
import * as partnerFinancialsController from "../controllers/partnerFinancials.controller";

spacePartnerRoutes.post("/invoices", partnerFinancialsController.createInvoice);
spacePartnerRoutes.get("/invoices", partnerFinancialsController.getInvoices);

spacePartnerRoutes.post("/payments", partnerFinancialsController.createPayment);
spacePartnerRoutes.get("/payments", partnerFinancialsController.getPayments);

// Team member management routes
spacePartnerRoutes.get("/team-members", getTeamMembers);
spacePartnerRoutes.post("/team-members", createTeamMember);
spacePartnerRoutes.delete("/team-members/:memberId", deleteTeamMember);

// Space user KYC routes (for partners to submit their own KYC)
spacePartnerRoutes.get("/kyc", spaceKycController.getMySpaceUserKyc);

// Business info KYC route
spacePartnerRoutes.put(
  "/kyc/business-info",
  spaceKycController.upsertSpaceUserKycBusinessInfo,
);
spacePartnerRoutes.put(
  "/kyc/bank-info",
  spaceKycController.upsertSpaceUserKycBankInfo,
);
spacePartnerRoutes.put("/kyc", spaceKycController.upsertSpaceUserKyc);

spacePartnerRoutes.post(
  "/kyc/upload",
  uploadKYCFile.single("file"),
  spaceKycController.uploadSpaceUserKycFile,
);
spacePartnerRoutes.post("/kyc/submit", spaceKycController.submitSpaceUserKyc);


