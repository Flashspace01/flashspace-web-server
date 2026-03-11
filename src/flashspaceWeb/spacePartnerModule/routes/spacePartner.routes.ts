import { Router } from "express";
import { requireSpacePartner } from "../middleware/spacePartner.middleware";
import * as spaceController from "../controllers/space.controller";
import * as spaceKycController from "../controllers/spacekyc.controller";
import * as dashboardController from "../controllers/spacePartnerDashboard.controller";
import * as staffController from "../controllers/staff.controller";
import {
  setSpaceDetails,
  getAllSpaceDetails,
  acceptSpaceDetails,
  rejectSpaceDetails,
} from "../controllers/spaceDetails.controller";

import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { uploadKYCFile } from "../../userDashboardModule/config/multer.config";

export const spacePartnerRoutes = Router();

// Base middleware for all space partner routes
spacePartnerRoutes.use(AuthMiddleware.authenticate);
// spacePartnerRoutes.use(requireSpacePartner);

// Staff management routes
spacePartnerRoutes.get("/staff", staffController.getMyStaff);
spacePartnerRoutes.post("/staff", staffController.addStaff);
spacePartnerRoutes.put("/staff/:id", staffController.updateStaff);
spacePartnerRoutes.delete("/staff/:id", staffController.deleteStaff);

// Accept/reject space details (admin or reviewer)
spacePartnerRoutes.put("/space-details/:id/accept", acceptSpaceDetails);
spacePartnerRoutes.put("/space-details/:id/reject", rejectSpaceDetails);

// Space Details routes
spacePartnerRoutes.post("/space-details", setSpaceDetails);
spacePartnerRoutes.get("/space-details", getAllSpaceDetails);

// Dashboard routes
spacePartnerRoutes.get("/dashboard", dashboardController.getDashboardStats);

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
// Space user KYC routes (for partners to submit their own KYC)
spacePartnerRoutes.get("/kyc", spaceKycController.getMySpaceUserKyc);

// Business info KYC route
spacePartnerRoutes.put(
  "/kyc/business-info",
  spaceKycController.upsertSpaceUserKycBusinessInfo,
);
spacePartnerRoutes.put("/kyc", spaceKycController.upsertSpaceUserKyc);

spacePartnerRoutes.post(
  "/kyc/upload",
  uploadKYCFile.single("file"),
  spaceKycController.uploadSpaceUserKycFile,
);
spacePartnerRoutes.post("/kyc/submit", spaceKycController.submitSpaceUserKyc);
