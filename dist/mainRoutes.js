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
const coworkingSpace_routes_1 = require("./flashspaceWeb/coworkingSpaceModule/coworkingSpace.routes");
const auth_routes_1 = require("./flashspaceWeb/authModule/routes/auth.routes");
const partnerInquiry_routes_1 = require("./flashspaceWeb/partnerInquiryModule/partnerInquiry.routes");
const payment_routes_1 = require("./flashspaceWeb/paymentModule/payment.routes");
const userDashboard_routes_1 = __importDefault(require("./flashspaceWeb/userDashboardModule/routes/userDashboard.routes"));
exports.mainRoutes = (0, express_1.Router)();
// /api/auth
exports.mainRoutes.use("/auth", auth_routes_1.authRoutes);
// /api/contactForm
exports.mainRoutes.use("/contactForm", contactForm_routes_1.contactFormRoutes);
// /api/spaceProvider
// mainRoutes.use("/spaceProvider", spaceProviderRoutes);
// /api/virtualOffice
exports.mainRoutes.use("/virtualOffice", virtualOffice_routes_1.virtualOfficeRoutes);
// /api/coworkingSpace
exports.mainRoutes.use("/coworkingSpace", coworkingSpace_routes_1.coworkingSpaceRoutes);
// /api/partnerInquiry
exports.mainRoutes.use("/partnerInquiry", partnerInquiry_routes_1.partnerInquiryRoutes);
// /api/payment
exports.mainRoutes.use("/payment", payment_routes_1.paymentRoutes);
// /api/user (Dashboard APIs)
exports.mainRoutes.use("/user", userDashboard_routes_1.default);
