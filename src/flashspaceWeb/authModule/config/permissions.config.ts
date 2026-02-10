import { UserRole } from "../models/user.model";

export enum Permission {
    // Space Management
    MANAGE_ALL_SPACES = "manage_all_spaces",
    MANAGE_OWN_SPACES = "manage_own_spaces",
    VIEW_ALL_SPACES = "view_all_spaces", // Read-only view of all spaces (Sales)

    // Booking Management
    VIEW_ALL_BOOKINGS = "view_all_bookings",
    VIEW_OWN_BOOKINGS = "view_own_bookings", // Partner/Space Manager scope
    MANAGE_BOOKINGS = "manage_bookings", // Create/Edit bookings (Admin/Sales)

    // User Management
    MANAGE_ALL_USERS = "manage_all_users",
    MANAGE_SPACE_MANAGERS = "manage_space_managers", // Partner can add managers

    // Financials
    VIEW_FINANCIALS = "view_financials", // View revenue, etc.

    // Leads
    MANAGE_LEADS = "manage_leads",
    VIEW_LEADS = "view_leads",

    // System
    MANAGE_SYSTEM = "manage_system", // CMS, SEO, Commission, etc.
    
    // NEW: Dashboard Access (common for all admin roles)
    VIEW_DASHBOARD = "view_dashboard"
}

export const RolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
        Permission.MANAGE_ALL_SPACES,
        Permission.VIEW_ALL_SPACES,
        Permission.VIEW_ALL_BOOKINGS,
        Permission.MANAGE_BOOKINGS,
        Permission.MANAGE_ALL_USERS,
        Permission.VIEW_FINANCIALS,
        Permission.MANAGE_LEADS,
        Permission.VIEW_LEADS,
        Permission.MANAGE_SYSTEM,
        Permission.VIEW_DASHBOARD
    ],
    [UserRole.PARTNER]: [
        Permission.MANAGE_OWN_SPACES,
        Permission.VIEW_OWN_BOOKINGS,
        Permission.MANAGE_SPACE_MANAGERS,
        Permission.VIEW_FINANCIALS, // Only their own, logic handled in service
        Permission.VIEW_DASHBOARD  // ADDED: Partner needs dashboard access
    ],
    [UserRole.SPACE_MANAGER]: [
        Permission.MANAGE_OWN_SPACES,
        Permission.VIEW_OWN_BOOKINGS,
        Permission.VIEW_DASHBOARD  // ADDED: Space Manager needs dashboard access
    ],
    [UserRole.SALES]: [
        Permission.VIEW_ALL_SPACES, // Read-only
        Permission.VIEW_ALL_BOOKINGS,
        Permission.MANAGE_BOOKINGS, // Can create manual bookings
        Permission.MANAGE_LEADS,
        Permission.VIEW_LEADS,
        Permission.VIEW_DASHBOARD  // ADDED: Sales needs dashboard access
    ],
    [UserRole.USER]: [], // Basic user permissions (booking, etc.) are public/authenticated scope
    [UserRole.VENDOR]: [] // Legacy role, no special permissions
};
