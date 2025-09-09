"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainRoutes = void 0;
const express_1 = require("express");
const contactForm_routes_1 = require("./flashspaceWeb/contactFormModule/contactForm.routes");
exports.mainRoutes = (0, express_1.Router)();
exports.mainRoutes.use("/contactForm", contactForm_routes_1.contactFormRoutes);
// mainRoutes.use("/spacePartners",spacePartnersRoutes);
