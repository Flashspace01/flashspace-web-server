import { Router } from "express";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import { UserRole } from "../authModule/models/user.model";
import { 
  uploadInvoice, 
  getPartnerInvoices, 
  getAllInvoicesAdmin, 
  markInvoicePaid,
  extractPaymentUtr,
} from "./partnerInvoice.controller";
import { uploadInvoiceFile } from "./config/multer.config";

const router = Router();

// Secure all routes
router.use(AuthMiddleware.authenticate);

// --- Partner Routes ---
router.post(
  "/", 
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadInvoiceFile.single("invoiceFile"),
  uploadInvoice
);

router.get(
  "/partner",
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  getPartnerInvoices
);

// --- Admin Routes ---
router.get(
  "/admin",
  AuthMiddleware.requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  getAllInvoicesAdmin
);

router.post(
  "/extract-utr",
  AuthMiddleware.requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadInvoiceFile.single("paymentProof"),
  extractPaymentUtr
);

router.post(
  "/extract-utr/:_cacheBust",
  AuthMiddleware.requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadInvoiceFile.single("paymentProof"),
  extractPaymentUtr
);

router.post(
  "/payment/extract-utr",
  AuthMiddleware.requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadInvoiceFile.single("paymentProof"),
  extractPaymentUtr
);

router.patch(
  "/:id/pay",
  AuthMiddleware.requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadInvoiceFile.single("paymentProof"),
  markInvoicePaid
);

export default router;
