"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactFormRoutes = void 0;
const express_1 = require("express");
const contactForm_controller_1 = require("./contactForm.controller");
exports.contactFormRoutes = (0, express_1.Router)();
// /api/contactForm/createContactForm
exports.contactFormRoutes.post("/createContactForm", contactForm_controller_1.createContactForm);
// /api/contactForm/getAllContactForm
exports.contactFormRoutes.get("/getAllContactForm", contactForm_controller_1.getAllContactForm);
// /api/contactForm/getContactFormById:contactId
exports.contactFormRoutes.get("/getContactFormById/:contactId", contactForm_controller_1.getContactFormById);
// /api/contactForm/updateContactForm
exports.contactFormRoutes.put("/updateContactForm/:contactId", contactForm_controller_1.updateContactForm);
// /api/contactForm/deleteContactForm
exports.contactFormRoutes.delete("/deleteContactForm/:contactId", contactForm_controller_1.deleteContactForm);
