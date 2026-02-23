import { Router } from "express";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import { UserRole } from "../authModule/models/user.model";
import { getAllInvoices, getInvoiceById } from "./invoice.controller";

const router = Router();

// All invoice routes require authentication
router.use(AuthMiddleware.authenticate);

// --- User & Admin Routes ---
router.get("/", getAllInvoices);

// --- Partner Specific Route (SECURED) ---
// FIXED: Static routes must come BEFORE dynamic /:id routes
router.get(
  "/partner",
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN),
  getAllInvoices,
);

// FIXED: Dynamic route moved to the bottom
router.get("/:invoiceId", getInvoiceById);

export default router;