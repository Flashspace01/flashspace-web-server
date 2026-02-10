import { Router } from "express";
import { createPartnerInquiry, getAllPartnerInquiries, updatePartnerInquiryStatus } from "./partnerInquiry.controller";
import { formSubmissionRateLimiter, readRateLimiter } from "../../config/rateLimiter.config";

export const partnerInquiryRoutes = Router();

// POST /api/partnerInquiry/submit
partnerInquiryRoutes.post("/submit", formSubmissionRateLimiter, createPartnerInquiry);

// GET /api/partnerInquiry/all
partnerInquiryRoutes.get("/all", readRateLimiter, getAllPartnerInquiries);

// PUT /api/partnerInquiry/:inquiryId/status
partnerInquiryRoutes.put("/:inquiryId/status", updatePartnerInquiryStatus);
