import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { RBACMiddleware } from "../../authModule/middleware/rbac.middleware";
import { Permission } from "../../authModule/config/permissions.config";
import { ticketRoutes } from "../../ticketModule/routes/ticket.routes";
import {
  getAllAffiliates,
  getAffiliateClients,
} from "../controllers/affiliateAdmin.controller";
import {
  reviewSpaceUserKycOverall,
  reviewSpaceUserKycDocument,
  getAllSpacePartnerKyc,
  getSpacePartnerKycById,
  getSpacePartnerPropertiesByKycId,
  getSpacePartnerPropertiesByUserId,
} from "../../spacePartnerModule/controllers/spacekyc.controller";
import { AffiliateAdminController } from "../../affiliatePortalModule/controllers/affiliateAdmin.controller";
import { financeRoutes } from "./finance.routes";
console.log("🔒 Admin Routes Loaded");
console.log("💰 Finance Routes Loaded");
export const adminRoutes = Router();
// 1. Authenticate all users
adminRoutes.use(AuthMiddleware.authenticate);

// 1.1 Partner Management (Renamed for troubleshooting)
adminRoutes.get(
  "/space-partners",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.VIEW_ALL_USERS,
  ]),
  AdminController.getPartners,
);

// Space Partner KYC Document Review (admin)
adminRoutes.put(
  "/spacePartner/kyc/document/review",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  reviewSpaceUserKycDocument,
);

// Space Partner KYC Overall Review (admin)
adminRoutes.put(
  "/spacePartner/kyc/overall/review",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  reviewSpaceUserKycOverall,
);

// Authentication removed as requested
// Space Partner KYC routes (admin, protected)
adminRoutes.get(
  "/spacePartner/kyc",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  getAllSpacePartnerKyc,
);
adminRoutes.get(
  "/spacePartner/kyc/:id",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  getSpacePartnerKycById,
);
adminRoutes.get(
  "/spacePartner/kyc/:id/properties",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  getSpacePartnerPropertiesByKycId,
);
adminRoutes.get(
  "/spacePartner/user/:userId/properties",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  getSpacePartnerPropertiesByUserId,
);

// 1. Authenticate all users (removed as per request)

// 2. Dashboard - Accessible by Admins, Partners, Space Managers, Sales
// We check if they have at least one relevant permission to be here
adminRoutes.get(
  "/dashboard",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_SPACES,
    Permission.MANAGE_OWN_SPACES,
    Permission.VIEW_ALL_SPACES,
    Permission.VIEW_DASHBOARD,
  ]),
  AdminController.getDashboardStats,
);

// 2.1 Revenue Dashboard
adminRoutes.get(
  "/revenue/dashboard",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_SPACES,
    Permission.MANAGE_OWN_SPACES,
    Permission.VIEW_ALL_SPACES,
  ]),
  AdminController.getRevenueDashboard,
);

// 2.2 Leaderboard Dashboard
adminRoutes.get(
  "/leaderboard",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.VIEW_DASHBOARD,
  ]),
  AdminController.getLeaderboard,
);

// 3. User Management - Currently Super Admin only
adminRoutes.get(
  "/users",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.VIEW_ALL_USERS,
  ]),
  AdminController.getUsers,
);
adminRoutes.get(
  "/partners",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_SPACES,
    Permission.VIEW_ALL_SPACES,
    Permission.MANAGE_ALL_USERS,
    Permission.VIEW_ALL_USERS,
  ]),
  AdminController.getPartnerUsers,
);
adminRoutes.post(
  "/users",
  RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
  AdminController.createUser,
);
adminRoutes.put(
  "/users/:id",
  RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
  AdminController.updateUser,
);
// Alias for PATCH
adminRoutes.patch(
  "/users/:id",
  RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
  AdminController.updateUser,
);
// Alias for explicit update path
adminRoutes.put(
  "/users/update/:id",
  RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
  AdminController.updateUser,
);

adminRoutes.delete(
  "/users/:id",
  RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
  AdminController.deleteUser,
);

// 4. Booking Management
adminRoutes.get(
  "/bookings",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_SPACES,
    Permission.MANAGE_OWN_SPACES,
    Permission.VIEW_ALL_SPACES,
  ]),
  AdminController.getAllBookings,
);
adminRoutes.patch(
  "/bookings/:bookingId/status",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_SPACES,
    Permission.MANAGE_OWN_SPACES,
    Permission.VIEW_ALL_SPACES,
  ]),
  AdminController.updateBookingStatus,
);

// 4.1 Client Management
adminRoutes.get(
  "/clients",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_SPACES,
    Permission.MANAGE_OWN_SPACES,
    Permission.VIEW_ALL_SPACES,
  ]),
  AdminController.getClients,
);

adminRoutes.get(
  "/clients/:clientId",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_SPACES,
    Permission.MANAGE_OWN_SPACES,
    Permission.VIEW_ALL_SPACES,
  ]),
  AdminController.getClientDetails,
);

// 5. KYC Management
adminRoutes.get(
  "/kyc/pending",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS, // Admin
    Permission.MANAGE_OWN_SPACES, // Partner/Manager (needs refinement later)
  ]),
  AdminController.getPendingKYC,
);
adminRoutes.put(
  "/kyc/:id/review",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  AdminController.reviewKYC,
);

// Get Partner KYC Details
adminRoutes.get(
  "/kyc/partner/:id",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  AdminController.getPartnerDetails,
);

adminRoutes.get(
  "/kyc/:id",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  AdminController.getKYCDetails,
);

adminRoutes.put(
  "/kyc/:id/document/:docId/review",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  AdminController.reviewKYCDocument,
);

// Partner KYC Management - List all requests
adminRoutes.get(
  "/kyc-requests",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  AdminController.getAllPartnerKYC,
);

// Partner KYC Management - User specific
adminRoutes.get(
  "/kyc/user/:userId/partners",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  AdminController.getPartnersByUser,
);

adminRoutes.put(
  "/kyc/partner/:partnerId/status",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  AdminController.updatePartnerStatus,
  // AdminController.updatePartnerStatus,
);

// Business Info Management
adminRoutes.get(
  "/kyc/user/:userId/business-info",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  AdminController.getBusinessInfoByUser,
);

adminRoutes.get(
  "/kyc/business-info/:id",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  AdminController.getBusinessInfoById,
);

adminRoutes.put(
  "/kyc/business-info/:id/status",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.MANAGE_OWN_SPACES,
  ]),
  AdminController.updateBusinessInfoStatus,
);

// --- B2B2C Space Onboarding & Approval ---
adminRoutes.get(
  "/spaces",
  RBACMiddleware.requirePermission(Permission.MANAGE_ALL_SPACES),
  AdminController.getAllSpaces,
);

adminRoutes.get(
  "/documents",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_USERS,
    Permission.VIEW_ALL_USERS,
  ]),
  AdminController.getAllDocuments,
);

adminRoutes.get(
  "/spaces/pending",
  RBACMiddleware.requirePermission(Permission.MANAGE_ALL_SPACES),
  AdminController.getPendingSpaces,
);

adminRoutes.put(
  "/spaces/:spaceType/:id/approve",
  RBACMiddleware.requirePermission(Permission.MANAGE_ALL_SPACES),
  AdminController.approveSpace,
);

adminRoutes.post(
  "/spaces/list-on-behalf",
  RBACMiddleware.requirePermission(Permission.MANAGE_ALL_SPACES),
  AdminController.listSpaceOnBehalf,
);

// 6. Ticket Management Routes (from ticket module)
adminRoutes.use("/tickets", ticketRoutes);

// 7. Affiliate Management (Admin only)
adminRoutes.get(
  "/affiliates",
  RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
  getAllAffiliates,
);

adminRoutes.get(
  "/affiliates/:affiliateId/clients",
  RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
  getAffiliateClients,
);

// 8. Payment Invoices
adminRoutes.get(
  "/invoices",
  RBACMiddleware.requireAnyPermission([
    Permission.MANAGE_ALL_SPACES,
    Permission.VIEW_ALL_SPACES,
    Permission.MANAGE_OWN_SPACES,
  ]),
  AdminController.getInvoices,
);

adminRoutes.get(
  "/affiliates/:id/stats",
  RBACMiddleware.requirePermission(Permission.MANAGE_ALL_USERS),
  AffiliateAdminController.getAffiliateStats,
);

// 9. Finance Management
adminRoutes.use("/finance", financeRoutes);

// Note: The ticket routes from ticketModule already have /admin prefix
// So they will be accessible at:
// GET /api/admin/tickets/admin/all
// GET /api/admin/tickets/admin/stats
// PUT /api/admin/tickets/admin/:ticketId
// etc.
