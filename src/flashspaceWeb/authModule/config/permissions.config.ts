import { UserRole } from "../models/user.model";

export enum Permission {
    // Space Management
    MANAGE_ALL_SPACES = "manage_all_spaces",
    MANAGE_OWN_SPACES = "manage_own_spaces",
    VIEW_ALL_SPACES = "view_all_spaces", // Read-only view of all spaces (Sales)

    // Booking Management
    VIEW_ALL_BOOKINGS = "view_all_bookings",
    VIEW_OWN_BOOKINGS = "view_own_bookings", // Partner scope
    MANAGE_BOOKINGS = "manage_bookings", // Create/Edit bookings (Admin/Sales)

    // User Management
    MANAGE_ALL_USERS = "manage_all_users",

    // Financials
    VIEW_FINANCIALS = "view_financials", // View revenue, etc.

    // Leads
    MANAGE_LEADS = "manage_leads",
    VIEW_LEADS = "view_leads",

    // System
    MANAGE_SYSTEM = "manage_system", // CMS, SEO, Commission, etc.

    // Dashboard Access (common for all admin roles)
    VIEW_DASHBOARD = "view_dashboard",

    // View All Users (Read-only for lists)
    VIEW_ALL_USERS = "view_all_users"
}

export const STAFF_ROLES = [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SUPPORT,
    UserRole.SALES,
    UserRole.AFFILIATE_MANAGER,
    UserRole.SPACE_PARTNER_MANAGER
];

export const RolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.SUPER_ADMIN]: Object.values(Permission), // Full unrestricted access
    [UserRole.ADMIN]: Object.values(Permission), // Admins also have nearly full scope
    [UserRole.PARTNER]: [
        Permission.MANAGE_OWN_SPACES,
        Permission.VIEW_OWN_BOOKINGS,
        Permission.VIEW_FINANCIALS, // Only their own, logic handled in service
        Permission.VIEW_DASHBOARD
    ],
    [UserRole.SALES]: [
        Permission.VIEW_ALL_SPACES, // Read-only
        Permission.VIEW_ALL_BOOKINGS,
        Permission.MANAGE_BOOKINGS, // Can create manual bookings
        Permission.MANAGE_LEADS,
        Permission.VIEW_LEADS,
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_ALL_USERS
    ],
    [UserRole.USER]: [], // Basic user permissions (booking, etc.) are public/authenticated scope

    [UserRole.AFFILIATE]: [
        Permission.MANAGE_LEADS,
        Permission.VIEW_LEADS,
        Permission.VIEW_DASHBOARD
    ],
    [UserRole.AFFILIATE_MANAGER]: [
        Permission.VIEW_DASHBOARD,
        Permission.MANAGE_SYSTEM, // required to access settings
        Permission.MANAGE_ALL_USERS // Required for /affiliates endpoint
    ],
    [UserRole.SPACE_PARTNER_MANAGER]: [
        Permission.VIEW_DASHBOARD,
        Permission.MANAGE_ALL_SPACES,
        Permission.VIEW_ALL_SPACES,
        Permission.MANAGE_SYSTEM // required to access settings
    ],
    [UserRole.SUPPORT]: [
        Permission.VIEW_DASHBOARD,
        // Typically support needs to see users and bookings to help them
        Permission.MANAGE_ALL_USERS,
        Permission.VIEW_ALL_BOOKINGS,
        Permission.VIEW_ALL_SPACES, // Required for the main dashboard endpoint
        Permission.MANAGE_OWN_SPACES, // Required for some specific KPI views
        Permission.MANAGE_SYSTEM, // required to access settings
        Permission.VIEW_ALL_USERS
    ],
};
