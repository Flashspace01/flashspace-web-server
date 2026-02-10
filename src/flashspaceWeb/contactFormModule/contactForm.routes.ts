import{Router} from "express";
import{createContactForm,getAllContactForm,getContactFormById,updateContactForm,deleteContactForm} from "./contactForm.controller";
import { formSubmissionRateLimiter, readRateLimiter } from "../../config/rateLimiter.config";

export const contactFormRoutes= Router();

// /api/contactForm/createContactForm
contactFormRoutes.post("/createContactForm", formSubmissionRateLimiter, createContactForm);
// /api/contactForm/getAllContactForm
contactFormRoutes.get("/getAllContactForm", readRateLimiter, getAllContactForm);
// /api/contactForm/getContactFormById:contactId
contactFormRoutes.get("/getContactFormById/:contactId",getContactFormById);
// /api/contactForm/updateContactForm
contactFormRoutes.put("/updateContactForm/:contactId",updateContactForm);
// /api/contactForm/deleteContactForm
contactFormRoutes.delete("/deleteContactForm/:contactId",deleteContactForm);
