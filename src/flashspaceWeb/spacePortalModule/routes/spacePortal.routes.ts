import { Router } from "express";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { getSpaceById, getSpaces } from "../controllers/spaces.controller";
import {
  getTicketById,
  getTickets,
  updateTicket,
} from "../controllers/tickets.controller";

export const spacePortalRoutes = Router();

// All Space Portal routes require authentication
spacePortalRoutes.use(AuthMiddleware.authenticate);

// Spaces (Partner Dashboard)
// Note: Created/Updated/Delete endpoints are deprecated and removed from routes.
spacePortalRoutes.get("/spaces", getSpaces);
spacePortalRoutes.get("/spaces/:spaceId", getSpaceById);

// Tickets
spacePortalRoutes.get("/tickets", getTickets);
spacePortalRoutes.get("/tickets/:ticketId", getTicketById);
spacePortalRoutes.patch("/tickets/:ticketId", updateTicket);
