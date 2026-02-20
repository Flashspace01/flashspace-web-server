"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainRoutes = void 0;
const express_1 = require("express");
const contactForm_routes_1 = require("./flashspaceWeb/contactFormModule/contactForm.routes");
// import { spaceProviderRoutes } from "./flashspaceWeb/spaceProviderModule/spaceProvider.routes";
const virtualOffice_routes_1 = require("./flashspaceWeb/virtualOfficeModule/virtualOffice.routes");
const coworkingspace_routes_1 = require("./flashspaceWeb/coworkingSpaceModule/coworkingspace.routes");
const auth_routes_1 = require("./flashspaceWeb/authModule/routes/auth.routes");
const partnerInquiry_routes_1 = require("./flashspaceWeb/partnerInquiryModule/partnerInquiry.routes");
const payment_routes_1 = require("./flashspaceWeb/paymentModule/payment.routes");
const userDashboard_routes_1 = __importDefault(require("./flashspaceWeb/userDashboardModule/routes/userDashboard.routes"));
const admin_routes_1 = require("./flashspaceWeb/adminModule/routes/admin.routes");
const spacePortal_routes_1 = require("./flashspaceWeb/spacePortalModule/routes/spacePortal.routes");
const ticket_routes_1 = require("./flashspaceWeb/ticketModule/routes/ticket.routes");
const meetingScheduler_routes_1 = require("./flashspaceWeb/meetingSchedulerModule/meetingScheduler.routes");
<<<<<<< HEAD
// import { spacePartnerRoutes } from "./flashspaceWeb/spacePartnerModule/routes/spacePartner.routes";
=======
const affiliate_routes_1 = require("./flashspaceWeb/affiliatePortalModule/routes/affiliate.routes");
const spacePartner_routes_1 = require("./flashspaceWeb/spacePartnerModule/routes/spacePartner.routes");
>>>>>>> fd79f040bc40257c0cb881c7d733a65884046221
const feedback_routes_1 = require("./flashspaceWeb/feebackModule/feedback.routes");
const coupon_routes_1 = require("./flashspaceWeb/couponModule/coupon.routes");
const mail_routes_1 = __importDefault(require("./flashspaceWeb/mailModule/routes/mail.routes"));
exports.mainRoutes = (0, express_1.Router)();
const mongoose_1 = __importDefault(require("mongoose"));
// /api/health - Check server and DB status
exports.mainRoutes.get("/health", (req, res) => {
    const dbStatus = mongoose_1.default.connection.readyState;
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
exports.mainRoutes.use("/auth", auth_routes_1.authRoutes);
// /api/contactForm
exports.mainRoutes.use("/contactForm", contactForm_routes_1.contactFormRoutes);
// /api/affiliate (Affiliate Portal APIs)
exports.mainRoutes.use("/affiliate", affiliate_routes_1.affiliateRoutes);
// /api/feeback
exports.mainRoutes.use("/feedback", feedback_routes_1.feedbackRoutes);
// /api/spaceProvider
// mainRoutes.use("/spaceProvider", spaceProviderRoutes);
// /api/virtualOffice
exports.mainRoutes.use("/virtualOffice", virtualOffice_routes_1.virtualOfficeRoutes);
// /api/coworkingSpace
exports.mainRoutes.use("/coworkingSpace", coworkingspace_routes_1.coworkingSpaceRoutes);
// /api/partnerInquiry
exports.mainRoutes.use("/partnerInquiry", partnerInquiry_routes_1.partnerInquiryRoutes);
// /api/payment
exports.mainRoutes.use("/payment", payment_routes_1.paymentRoutes);
// /api/user (Dashboard APIs)
exports.mainRoutes.use("/user", userDashboard_routes_1.default);
// /api/admin (Admin Dashboard APIs)
exports.mainRoutes.use("/admin", admin_routes_1.adminRoutes);
// /api/spaceportal (Space Portal APIs)
exports.mainRoutes.use("/spaceportal", spacePortal_routes_1.spacePortalRoutes);
// /api/spacePartner
// mainRoutes.use("/spacePartner", spacePartnerRoutes);
// /api/meetings (Meeting Scheduler APIs)
exports.mainRoutes.use("/meetings", meetingScheduler_routes_1.meetingSchedulerRoutes);
// /api/coupon
// /api/coupon
exports.mainRoutes.use("/coupon", coupon_routes_1.couponRoutes);
<<<<<<< HEAD
exports.mainRoutes.use("/tickets", ticket_routes_1.ticketRoutes);
// /api/notifications
const notification_routes_1 = require("./flashspaceWeb/notificationModule/routes/notification.routes");
exports.mainRoutes.use("/notifications", notification_routes_1.notificationRoutes);
// /api/reviews
const review_routes_1 = require("./flashspaceWeb/reviewsModule/review.routes");
exports.mainRoutes.use("/reviews", review_routes_1.reviewRoutes);
// /api/meetingRooms
const meetingRoom_routes_1 = require("./flashspaceWeb/meetingRoomModule/meetingRoom.routes");
exports.mainRoutes.use("/meetingRooms", meetingRoom_routes_1.meetingRoomRoutes);
=======
// /api/mail
exports.mainRoutes.use("/mail", mail_routes_1.default);
exports.mainRoutes.use('/tickets', ticket_routes_1.ticketRoutes);
// /api/notifications
const notification_routes_1 = require("./flashspaceWeb/notificationModule/routes/notification.routes");
exports.mainRoutes.use('/notifications', notification_routes_1.notificationRoutes);
// /api/visit
const visit_routes_1 = __importDefault(require("./flashspaceWeb/visitModule/routes/visit.routes"));
exports.mainRoutes.use('/visit', visit_routes_1.default);
>>>>>>> fd79f040bc40257c0cb881c7d733a65884046221
