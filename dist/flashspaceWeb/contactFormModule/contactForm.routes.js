"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactFormRoutes = void 0;
const express_1 = require("express");
const contactForm_controller_1 = require("./contactForm.controller");
exports.contactFormRoutes = (0, express_1.Router)();
exports.contactFormRoutes.post("/createContactForm", contactForm_controller_1.createContactForm);
exports.contactFormRoutes.get("/getAllContactForm", contactForm_controller_1.getAllContactForm);
