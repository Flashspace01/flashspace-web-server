import { Router } from "express";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { uploadKYCFile } from "../config/multer.config";
import {
  getDashboardOverview,
  getAllBookings,
  getBookingById,
  toggleAutoRenew,
  getKYCStatus,
  updateBusinessInfo,
  uploadKYCDocument,
  deleteKYCDocument,
  linkBookingToProfile,
  getAllInvoices,
  getInvoiceById,
  getAllTickets,
  createTicket,
  getTicketById,
  replyToTicket,
} from "../controllers/userDashboard.controller";

const router = Router();
// All routes require authentication
router.use(AuthMiddleware.authenticate);

// ============ DASHBOARD ============
router.get("/dashboard", getDashboardOverview);

// ============ BOOKINGS ============
router.get("/bookings", getAllBookings);
router.get("/bookings/:bookingId", getBookingById);
router.patch("/bookings/:bookingId/auto-renew", toggleAutoRenew);
router.post("/bookings/:bookingId/link-profile", linkBookingToProfile);

// ============ KYC ============
// ============ KYC ============
router.get("/kyc", getKYCStatus);
router.put("/kyc/business-info", updateBusinessInfo);
router.post("/kyc/upload", (req, res, next) => {
  console.log("[Route] /kyc/upload hit. Content-Type:", req.headers['content-type']);
  uploadKYCFile.single('file')(req, res, (err) => {
    if (err) {
      console.error("[Multer Error]", err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: "File too large. Max 5MB allowed." });
      }
      return res.status(400).json({ success: false, message: err.message || "File upload error" });
    }
    console.log("[Multer] Middleware completed. File:", req.file ? "Found" : "Missing");
    next();
  });
}, uploadKYCDocument);
router.delete("/kyc/upload", deleteKYCDocument);

// ============ INVOICES ============
router.get("/invoices", getAllInvoices);
router.get("/invoices/:invoiceId", getInvoiceById);

// ============ SUPPORT TICKETS ============
router.get("/support/tickets", getAllTickets);
router.post("/support/tickets", createTicket);
router.get("/support/tickets/:ticketId", getTicketById);
router.post("/support/tickets/:ticketId/reply", replyToTicket);

export default router;
