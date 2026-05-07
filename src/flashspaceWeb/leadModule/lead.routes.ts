import { Router } from "express";
import { createLead, getLeads, createBookingLead } from "./lead.controller";

export const leadRoutes = Router();

leadRoutes.post("/", createLead);
leadRoutes.post("/booking-lead", createBookingLead);
leadRoutes.get("/", getLeads);
