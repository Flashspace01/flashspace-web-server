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
import { ticketRoutes } from './flashspaceWeb/ticketModule/routes/ticket.routes';
import { meetingSchedulerRoutes } from "./flashspaceWeb/meetingSchedulerModule/meetingScheduler.routes";
import { affiliateRoutes } from "./flashspaceWeb/affiliatePortalModule/routes/affiliate.routes";
import { spacePartnerRoutes } from "./flashspaceWeb/spacePartnerModule/routes/spacePartner.routes";
import { feedbackRoutes } from "./flashspaceWeb/feebackModule/feedback.routes";
import { couponRoutes } from "./flashspaceWeb/couponModule/coupon.routes";

import mailRoutes from "./flashspaceWeb/mailModule/routes/mail.routes";
export const mainRoutes = Router();

import mongoose from "mongoose";

// /api/health - Check server and DB status
mainRoutes.get("/health", (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    const statusMap = {
        0: "Disconnected",
        1: "Connected",
        2: "Connecting",
        3: "Disconnecting",
    };
    res.json({
        success: true,
        message: "Server is running",
        // dbStatus: statusMap[dbStatus] || "Unknown",
        dbReadyState: dbStatus,
        envPort: process.env.PORT,
        timestamp: new Date()
    });
});

// /api/auth
mainRoutes.use("/auth", authRoutes);
// /api/contactForm
mainRoutes.use("/contactForm", contactFormRoutes);
// /api/affiliate (Affiliate Portal APIs)
mainRoutes.use("/affiliate", affiliateRoutes);
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
// /api/spacePartner
mainRoutes.use("/spacePartner", spacePartnerRoutes);
// /api/meetings (Meeting Scheduler APIs)
mainRoutes.use("/meetings", meetingSchedulerRoutes);
// /api/coupons
mainRoutes.use("/coupons", couponRoutes);
// /api/mail
mainRoutes.use("/mail", mailRoutes);




mainRoutes.use('/tickets', ticketRoutes);

// /api/notifications
import { notificationRoutes } from "./flashspaceWeb/notificationModule/routes/notification.routes";
mainRoutes.use('/notifications', notificationRoutes);

// /api/visit
import visitRoutes from "./flashspaceWeb/visitModule/routes/visit.routes";
mainRoutes.use('/visit', visitRoutes);