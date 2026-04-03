import { Router } from "express";
import { createLead } from "./lead.controller";

export const leadRoutes = Router();

leadRoutes.post("/", createLead);
