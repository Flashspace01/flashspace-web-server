import{Router} from "express";
import{createContactForm,getAllContactForm} from "./contactForm.controller";

export const contactFormRoutes= Router();

contactFormRoutes.post("/createContactForm",createContactForm);
contactFormRoutes.get("/getAllContactForm",getAllContactForm);
