import { Router } from "express";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import {
  createSpace,
  deleteSpace,
  getSpaceById,
  getSpaces,
  updateSpace,
} from "../controllers/spaces.controller";
import {
  createClient,
  deleteClient,
  getClientById,
  getClients,
  updateClient,
} from "../controllers/clients.controller";
import {
  createEnquiry,
  deleteEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  updateEnquiryStatus,
} from "../controllers/enquiries.controller";
import {
  getTicketById,
  getTickets,
  updateTicket,
} from "../controllers/tickets.controller";
import {
  createBooking,
  createBookingRequest,
  getBookingRequests,
  getBookings,
  updateBookingRequestStatus,
} from "../controllers/bookings.controller";
import {
  createInvoice,
  getInvoiceById,
  getInvoices,
} from "../controllers/invoices.controller";
import {
  clearNotifications,
  deleteNotification,
  getNotifications,
  markNotificationRead,
  restoreNotification,
} from "../controllers/notifications.controller";
import { getSettings, updateSettings } from "../controllers/settings.controller";
import { getBookingAnalytics } from "../controllers/analytics.controller";
import { getClientDetails } from "../controllers/clientDetails.controller";
import { getProfile, updateProfile } from "../controllers/profile.controller";
import {
  validateCreateSpace,
  validateListSpaces,
  validateUpdateSpace,
} from "../validators/spaces.validator";
import {
  validateCreateClient,
  validateListClients,
  validateUpdateClient,
} from "../validators/clients.validator";
import {
  validateCreateEnquiry,
  validateListEnquiries,
  validateUpdateEnquiry,
  validateUpdateEnquiryStatus,
} from "../validators/enquiries.validator";
import {
  validateListTickets,
  validateUpdateTicket,
} from "../validators/tickets.validator";
import {
  validateCreateBooking,
  validateCreateBookingRequest,
  validateListBookingRequests,
  validateListBookings,
  validateUpdateBookingRequestStatus,
} from "../validators/bookings.validator";
import {
  validateCreateInvoice,
  validateListInvoices,
} from "../validators/invoices.validator";
import { validateClientDetails } from "../validators/clientDetails.validator";
import { validateUpdateProfile } from "../validators/profile.validator";

export const spacePortalRoutes = Router();

// All Space Portal routes require authentication
spacePortalRoutes.use(AuthMiddleware.authenticate);

// Spaces
spacePortalRoutes.post("/spaces", validateCreateSpace, createSpace);
spacePortalRoutes.get("/spaces", validateListSpaces, getSpaces);
spacePortalRoutes.get("/spaces/:spaceId", getSpaceById);
spacePortalRoutes.patch("/spaces/:spaceId", validateUpdateSpace, updateSpace);
spacePortalRoutes.delete("/spaces/:spaceId", deleteSpace);

// Clients
spacePortalRoutes.post("/clients", validateCreateClient, createClient);
spacePortalRoutes.get("/clients", validateListClients, getClients);
spacePortalRoutes.get("/clients/:clientId", getClientById);
spacePortalRoutes.get(
  "/clients/:clientId/details",
  validateClientDetails,
  getClientDetails
);
spacePortalRoutes.patch("/clients/:clientId", validateUpdateClient, updateClient);
spacePortalRoutes.delete("/clients/:clientId", deleteClient);

// Enquiries
spacePortalRoutes.post("/enquiries", validateCreateEnquiry, createEnquiry);
spacePortalRoutes.get("/enquiries", validateListEnquiries, getEnquiries);
spacePortalRoutes.get("/enquiries/:enquiryId", getEnquiryById);
spacePortalRoutes.patch("/enquiries/:enquiryId", validateUpdateEnquiry, updateEnquiry);
spacePortalRoutes.patch(
  "/enquiries/:enquiryId/status",
  validateUpdateEnquiryStatus,
  updateEnquiryStatus
);
spacePortalRoutes.delete("/enquiries/:enquiryId", deleteEnquiry);

// Tickets
spacePortalRoutes.get("/tickets", validateListTickets, getTickets);
spacePortalRoutes.get("/tickets/:ticketId", getTicketById);
spacePortalRoutes.patch("/tickets/:ticketId", validateUpdateTicket, updateTicket);

// Bookings
spacePortalRoutes.post("/bookings", validateCreateBooking, createBooking);
spacePortalRoutes.get("/bookings", validateListBookings, getBookings);
spacePortalRoutes.get(
  "/bookings/requests",
  validateListBookingRequests,
  getBookingRequests
);
spacePortalRoutes.post(
  "/bookings/requests",
  validateCreateBookingRequest,
  createBookingRequest
);
spacePortalRoutes.patch(
  "/bookings/requests/:requestId",
  validateUpdateBookingRequestStatus,
  updateBookingRequestStatus
);

// Invoices
spacePortalRoutes.get("/invoices", validateListInvoices, getInvoices);
spacePortalRoutes.get("/invoices/:invoiceId", getInvoiceById);
spacePortalRoutes.post("/invoices", validateCreateInvoice, createInvoice);

// Notifications
spacePortalRoutes.get("/notifications", getNotifications);
spacePortalRoutes.patch(
  "/notifications/:notificationId/read",
  markNotificationRead
);
spacePortalRoutes.delete("/notifications/:notificationId", deleteNotification);
spacePortalRoutes.post(
  "/notifications/:notificationId/restore",
  restoreNotification
);
spacePortalRoutes.post("/notifications/clear", clearNotifications);

// Settings
spacePortalRoutes.get("/settings", getSettings);
spacePortalRoutes.patch("/settings", updateSettings);

// Profile
spacePortalRoutes.get("/profile", getProfile);
spacePortalRoutes.patch("/profile", validateUpdateProfile, updateProfile);

// Analytics
spacePortalRoutes.get("/analytics/booking", getBookingAnalytics);
