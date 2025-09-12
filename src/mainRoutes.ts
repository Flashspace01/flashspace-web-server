import { Router } from "express";
import { contactFormRoutes } from "./flashspaceWeb/contactFormModule/contactForm.routes"
import { spaceProviderRoutes } from "./flashspaceWeb/spaceProviderModule/spaceProvider.routes";

export const mainRoutes = Router();

// /api/contactForm
mainRoutes.use("/contactForm", contactFormRoutes);
// /api/spaceProvider
mainRoutes.use("/spaceProvider", spaceProviderRoutes);


