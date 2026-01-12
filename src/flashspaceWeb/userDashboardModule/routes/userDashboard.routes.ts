import { Router } from "express";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import {
  getDashboardOverview,
  getAllBookings,
  getBookingById,
  toggleAutoRenew,
  getKYCStatus,
  updateBusinessInfo,
  uploadKYCDocument,
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

// ============ KYC ============
router.get("/kyc", getKYCStatus);
router.put("/kyc/business-info", updateBusinessInfo);
router.post("/kyc/upload", uploadKYCDocument);

// ============ INVOICES ============
router.get("/invoices", getAllInvoices);
router.get("/invoices/:invoiceId", getInvoiceById);

// ============ SUPPORT TICKETS ============
router.get("/support/tickets", getAllTickets);
router.post("/support/tickets", createTicket);
router.get("/support/tickets/:ticketId", getTicketById);
router.post("/support/tickets/:ticketId/reply", replyToTicket);

export default router;
