import { Router } from "express";
import { contactFormRoutes } from "./flashspaceWeb/contactFormModule/contactForm.routes"
// import { spaceProviderRoutes } from "./flashspaceWeb/spaceProviderModule/spaceProvider.routes";
import { virtualOfficeRoutes } from "./flashspaceWeb/virtualOfficeModule/virtualOffice.routes";
import { coworkingSpaceRoutes } from "./flashspaceWeb/coworkingSpaceModule/coworkingSpace.routes";
import { authRoutes } from "./flashspaceWeb/authModule/routes/auth.routes";
import { partnerInquiryRoutes } from "./flashspaceWeb/partnerInquiryModule/partnerInquiry.routes";
import { paymentRoutes } from "./flashspaceWeb/paymentModule/payment.routes";
import userDashboardRoutes from "./flashspaceWeb/userDashboardModule/routes/userDashboard.routes";
import { adminRoutes } from "./flashspaceWeb/adminModule/routes/admin.routes";
import { spacePortalRoutes } from "./flashspaceWeb/spacePortalModule/routes/spacePortal.routes";
import { ticketRoutes } from './flashspaceWeb/ticketModule/routes/ticket.routes';
import { meetingSchedulerRoutes } from "./flashspaceWeb/meetingSchedulerModule/meetingScheduler.routes";

import { spacePartnerRoutes } from "./flashspaceWeb/spacePartnerModule/routes/spacePartner.routes";
import { feedbackRoutes } from "./flashspaceWeb/feebackModule/feedback.routes";
import { couponRoutes } from "./flashspaceWeb/couponModule/coupon.routes";

export const mainRoutes = Router();

// /api/auth
mainRoutes.use("/auth", authRoutes);
// /api/contactForm
mainRoutes.use("/contactForm", contactFormRoutes);
// /api/feeback
mainRoutes.use("/feedback", feedbackRoutes)
// /api/spaceProvider
// mainRoutes.use("/spaceProvider", spaceProviderRoutes);
// /api/virtualOffice
mainRoutes.use("/virtualOffice", virtualOfficeRoutes);
// /api/coworkingSpace
mainRoutes.use("/coworkingSpace", coworkingSpaceRoutes);
// /api/partnerInquiry
mainRoutes.use("/partnerInquiry", partnerInquiryRoutes);
// /api/payment
mainRoutes.use("/payment", paymentRoutes);
// /api/user (Dashboard APIs)
mainRoutes.use("/user", userDashboardRoutes);
// /api/admin (Admin Dashboard APIs)
mainRoutes.use("/admin", adminRoutes);
// /api/spaceportal (Space Portal APIs)
mainRoutes.use("/spaceportal", spacePortalRoutes);
// /api/spacePartner
mainRoutes.use("/spacePartner", spacePartnerRoutes);
// /api/meetings (Meeting Scheduler APIs)
mainRoutes.use("/meetings", meetingSchedulerRoutes);
// /api/coupon
mainRoutes.use("/coupon", couponRoutes);


mainRoutes.use('/tickets', ticketRoutes);