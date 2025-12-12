import { Router } from "express";
import { createPartnerInquiry, getAllPartnerInquiries, updatePartnerInquiryStatus } from "./partnerInquiry.controller";

export const partnerInquiryRoutes = Router();

// POST /api/partnerInquiry/submit
partnerInquiryRoutes.post("/submit", createPartnerInquiry);

// GET /api/partnerInquiry/all
partnerInquiryRoutes.get("/all", getAllPartnerInquiries);

// PUT /api/partnerInquiry/:inquiryId/status
partnerInquiryRoutes.put("/:inquiryId/status", updatePartnerInquiryStatus);
