import { Router } from "express";
import {
  createLead,
  getLeads,
  createBookingLead,
  updateBookingLeadStatus,
} from "./lead.controller";

export const leadRoutes = Router();

leadRoutes.post("/", createLead);
leadRoutes.post("/booking-lead", createBookingLead);
leadRoutes.get("/", getLeads);
leadRoutes.patch("/:id/status", updateBookingLeadStatus);
leadRoutes.patch("/booking-lead/:id/status", updateBookingLeadStatus);
