import express from "express";
// Change import style to destructuring to catch errors at compile time
import { create, getAll, getRecent, getStats, getAvailableSpaces } from "../controllers/quotation.controller";
import * as leadController from "../controllers/affiliateLead.controller";
import * as supportController from "../controllers/support.controller";
import { getLeaderboard } from "../controllers/leaderboard.controller";
import { getDashboardStats, getAIInsights } from "../controllers/affiliateDashboard.controller";
import { getMyClients } from "../controllers/affiliateClient.controller";
import * as invoiceController from "../controllers/affiliateInvoice.controller";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { UserRole } from "../../authModule/models/user.model";
import { couponController } from "../../couponModule/coupon.controller";

const router = express.Router();

// Debugging: Check if functions are defined
if (!create || !getAll || !getRecent || !getStats) {
    console.error("Error: One or more controller functions are undefined!");
    console.error({ create, getAll, getRecent, getStats });
}

// Affiliate portal data is only for logged-in affiliate/admin users.
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireRole(UserRole.AFFILIATE, UserRole.ADMIN));

// Coupon Routes
router.post("/coupons/generate", (req, res) => {
    console.log("DEBUG: Hit POST /api/affiliate/coupons/generate");
    return couponController.generateAffiliateCoupon(req, res);
});
router.get("/my-coupon", (req, res) => {
    return couponController.getAffiliateCoupon(req, res);
});

// Quotation Routes
router.post("/quotations", create);
router.get("/quotations", getAll);
router.get("/quotations/recent", getRecent);
router.get("/quotations/stats", getStats);
router.get("/spaces", getAvailableSpaces);

// Lead Routes
router.post("/leads", leadController.create);
router.get("/leads", leadController.getAll);
router.get("/leads/:id", leadController.getOne);
router.put("/leads/:id", leadController.update);
router.delete("/leads/:id", leadController.deleteOne);

// Support Routes
router.post("/support/tickets", supportController.createTicket);
router.get("/support/tickets", supportController.getTickets);
router.post("/support/chat", supportController.chat);

// Leaderboard Routes
router.get("/leaderboard", getLeaderboard);

// Dashboard Routes
router.get("/dashboard/stats", getDashboardStats);
router.get("/dashboard/insights", getAIInsights);

// Client Management Routes
router.get("/clients", getMyClients);

// Invoice Routes
router.get("/invoices", invoiceController.getInvoices);
router.get("/invoices/:id", invoiceController.getInvoiceById);

console.log("🚀 affiliate.routes.ts is being loaded...");
export { router as affiliateRoutes };
