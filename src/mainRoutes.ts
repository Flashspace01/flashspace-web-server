import { Router } from "express";
import { contactFormRoutes } from "./flashspaceWeb/contactFormModule/contactForm.routes"
import { spaceProviderRoutes } from "./flashspaceWeb/spaceProviderModule/spaceProvider.routes";
import { virtualOfficeRoutes } from "./flashspaceWeb/virtualOfficeModule/virtualOffice.routes";
import { coworkingSpaceRoutes } from "./flashspaceWeb/coworkingSpaceModule/coworkingSpace.routes";

export const mainRoutes = Router();

// /api/contactForm
mainRoutes.use("/contactForm", contactFormRoutes);
// /api/spaceProvider
mainRoutes.use("/spaceProvider", spaceProviderRoutes);
// /api/virtualOffice
mainRoutes.use("/virtualOffice", virtualOfficeRoutes);
// /api/coworkingSpace
mainRoutes.use("/coworkingSpace", coworkingSpaceRoutes);


