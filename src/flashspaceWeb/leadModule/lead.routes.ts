import { Router } from "express";
import { createLead, getLeads } from "./lead.controller";

export const leadRoutes = Router();

leadRoutes.post("/", createLead);
leadRoutes.get("/", getLeads);
