import { Router } from "express";
import { contactFormRoutes } from "./flashspaceWeb/contactFormModule/contactForm.routes"
// import { spaceProviderRoutes } from "./flashspaceWeb/spaceProviderModule/spaceProvider.routes";
import { virtualOfficeRoutes } from "./flashspaceWeb/virtualOfficeModule/virtualOffice.routes";
import { coworkingSpaceRoutes } from "./flashspaceWeb/coworkingSpaceModule/coworkingSpace.routes";
import { authRoutes } from "./flashspaceWeb/authModule/routes/auth.routes";
import { partnerInquiryRoutes } from "./flashspaceWeb/partnerInquiryModule/partnerInquiry.routes";

export const mainRoutes = Router();

// /api/auth
mainRoutes.use("/auth", authRoutes);
// /api/contactForm
mainRoutes.use("/contactForm", contactFormRoutes);
// /api/spaceProvider
// mainRoutes.use("/spaceProvider", spaceProviderRoutes);
// /api/virtualOffice
mainRoutes.use("/virtualOffice", virtualOfficeRoutes);
// /api/coworkingSpace
mainRoutes.use("/coworkingSpace", coworkingSpaceRoutes);
// /api/partnerInquiry
mainRoutes.use("/partnerInquiry", partnerInquiryRoutes);


