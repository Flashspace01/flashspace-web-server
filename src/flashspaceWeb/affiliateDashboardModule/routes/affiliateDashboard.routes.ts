import { Router } from "express";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { UserRole } from "../../authModule/models/user.model";
import {
    getDashboardStats,
    getAllBookings,
    getBookingById,
    createBooking,
    updateBooking,
    deleteBooking
} from "../controllers/bookingManagement.controller";
import {
    getRevenueStats,
    getMonthlyTrend,
    getRevenueByProduct,
    getAllRevenueEntries,
    getRevenueEntryById,
    createRevenueEntry,
    updateRevenueEntry,
    deleteRevenueEntry
} from "../controllers/revenueDashboard.controller";
import {
    getPayoutStats,
    getPayouts,
    requestPayout,
    updatePayout,
    cancelPayout
} from "../controllers/payouts.controller";
import {
    getInvoiceStats,
    getInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice
} from "../controllers/invoices.controller";

const affiliateDashboardRoutes = Router();

// ============ BOOKING MANAGEMENT ============

// Get Dashboard Statistics
affiliateDashboardRoutes.get("/booking-management/stats",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    getDashboardStats
);

// Get All Bookings (with filtering & pagination)
affiliateDashboardRoutes.get("/booking-management/bookings",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    getAllBookings
);

// Create a New Booking
affiliateDashboardRoutes.post("/booking-management/bookings",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    createBooking
);

// Get Single Booking Details
affiliateDashboardRoutes.get("/booking-management/bookings/:id",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    getBookingById
);

// Update a Booking
affiliateDashboardRoutes.put("/booking-management/bookings/:id",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    updateBooking
);

// Delete a Booking
affiliateDashboardRoutes.delete("/booking-management/bookings/:id",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    deleteBooking
);


// ============ REVENUE DASHBOARD (ANALYTICS) ============

// Analytics Routes
affiliateDashboardRoutes.get("/revenue-dashboard/stats",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    getRevenueStats
);
affiliateDashboardRoutes.get("/revenue-dashboard/trend",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    getMonthlyTrend
);
affiliateDashboardRoutes.get("/revenue-dashboard/products",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    getRevenueByProduct
);

// CRUD for Manual Revenue Entries (Bonuses, Adjustments)
affiliateDashboardRoutes.get("/revenue-dashboard/entry",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    getAllRevenueEntries
);
affiliateDashboardRoutes.get("/revenue-dashboard/entry/:id",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    getRevenueEntryById
);
affiliateDashboardRoutes.post("/revenue-dashboard/entry",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    createRevenueEntry
);
affiliateDashboardRoutes.put("/revenue-dashboard/entry/:id",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    updateRevenueEntry
);
affiliateDashboardRoutes.delete("/revenue-dashboard/entry/:id",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    deleteRevenueEntry
);


// ============ PAYOUTS ============

// Get Overview Stats
affiliateDashboardRoutes.get("/payouts/stats",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    getPayoutStats
);

// Get Payout History/List
affiliateDashboardRoutes.get("/payouts/history",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    getPayouts
);

// Request Payout (Create)
affiliateDashboardRoutes.post("/payouts/request",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    requestPayout
);

// Update Payout (Update) - e.g. update bank details
affiliateDashboardRoutes.put("/payouts/request/:id",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    updatePayout
);

// Cancel Payout (Delete)
affiliateDashboardRoutes.delete("/payouts/request/:id",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    cancelPayout
);


// ============ INVOICES ============

// Get Invoice Stats
affiliateDashboardRoutes.get("/invoices/stats",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    getInvoiceStats
);

// Get Invoices List
affiliateDashboardRoutes.get("/invoices",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    getInvoices
);

// Create Invoice
affiliateDashboardRoutes.post("/invoices",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    createInvoice
);

// Update Invoice
affiliateDashboardRoutes.put("/invoices/:id",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    updateInvoice
);

// Delete Invoice
affiliateDashboardRoutes.delete("/invoices/:id",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE_PARTNER),
    deleteInvoice
);

export default affiliateDashboardRoutes;
