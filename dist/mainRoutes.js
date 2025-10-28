"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainRoutes = void 0;
const express_1 = require("express");
const contactForm_routes_1 = require("./flashspaceWeb/contactFormModule/contactForm.routes");
const spaceProvider_routes_1 = require("./flashspaceWeb/spaceProviderModule/spaceProvider.routes");
const virtualOffice_routes_1 = require("./flashspaceWeb/virtualOfficeModule/virtualOffice.routes");
const coworkingSpace_routes_1 = require("./flashspaceWeb/coworkingSpaceModule/coworkingSpace.routes");
exports.mainRoutes = (0, express_1.Router)();
// /api/contactForm
exports.mainRoutes.use("/contactForm", contactForm_routes_1.contactFormRoutes);
// /api/spaceProvider
exports.mainRoutes.use("/spaceProvider", spaceProvider_routes_1.spaceProviderRoutes);
// /api/virtualOffice
exports.mainRoutes.use("/virtualOffice", virtualOffice_routes_1.virtualOfficeRoutes);
// /api/coworkingSpace
exports.mainRoutes.use("/coworkingSpace", coworkingSpace_routes_1.coworkingSpaceRoutes);
