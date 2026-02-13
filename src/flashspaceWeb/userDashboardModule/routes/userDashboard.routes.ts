import { Router } from "express";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { uploadKYCFile } from "../config/multer.config";
import {
  getDashboardOverview,
  getAllBookings,
  getBookingById,
  getBookingsByProperty,
  toggleAutoRenew,
  getKYCStatus,
  updateBusinessInfo,
  uploadKYCDocument,
  deleteKYCDocument,
  submitKYCForReview,
  linkBookingToProfile,
  getAllInvoices,
  getInvoiceById,
  getAllTickets,
  createTicket,
  getTicketById,
  replyToTicket,
  getCredits,
  redeemReward,
  getPartnerSpaceBookings,
} from "../controllers/userDashboard.controller";

const router = Router();
// All routes require authentication
router.use(AuthMiddleware.authenticate);

// ============ DASHBOARD ============
router.get("/dashboard", getDashboardOverview);

// ============ PARTNER BOOKINGS ============
router.get("/partner/space/:spaceId/bookings", getPartnerSpaceBookings);

// ============ BOOKINGS ============
router.get("/bookings", getAllBookings);
router.get("/bookings/property/:spaceId", getBookingsByProperty);
router.get("/bookings/:bookingId", getBookingById);
router.patch("/bookings/:bookingId/auto-renew", toggleAutoRenew);
router.post("/bookings/:bookingId/link-profile", linkBookingToProfile);


// ============ KYC ============
router.get("/kyc", getKYCStatus);
router.put("/kyc/business-info", updateBusinessInfo);
router.post(
  "/kyc/upload",
  (req, res, next) => {
    console.log("[Route] /kyc/upload hit (Pre-Multer)");
    uploadKYCFile.single("file")(req, res, (err) => {
      if (err) {
        console.error("[Multer Error]", err.message);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File too large. Max 50MB allowed for videos.",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "File upload error",
        });
      }
      console.log("[Multer] Middleware completed.");
      console.log(
        "[Route] ProfileId:",
        req.body.profileId,
        "DocType:",
        req.body.documentType,
        "File:",
        req.file?.originalname,
      );
      next();
    });
  },
  uploadKYCDocument,
);
router.delete("/kyc/upload", deleteKYCDocument);
router.post("/kyc/submit", submitKYCForReview);

// ============ INVOICES ============
router.get("/invoices", getAllInvoices);
router.get("/invoices/:invoiceId", getInvoiceById);

// ============ SUPPORT TICKETS ============
router.get("/support/tickets", getAllTickets);
router.post("/support/tickets", createTicket);
router.get("/support/tickets/:ticketId", getTicketById);
router.post("/support/tickets/:ticketId/reply", replyToTicket);

// ============ CREDITS & REWARDS ============
router.get("/credits", getCredits);
router.post("/credits/redeem", redeemReward);

export default router;
