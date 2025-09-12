import{Router} from "express";
import{createContactForm,getAllContactForm,getContactFormById,updateContactForm,deleteContactForm} from "./contactForm.controller";

export const contactFormRoutes= Router();

// /api/contactForm/createContactForm
contactFormRoutes.post("/createContactForm",createContactForm);
// /api/contactForm/getAllContactForm
contactFormRoutes.get("/getAllContactForm",getAllContactForm);
// /api/contactForm/getContactFormById:contactId
contactFormRoutes.get("/getContactFormById/:contactId",getContactFormById);
// /api/contactForm/updateContactForm
contactFormRoutes.put("/updateContactForm/:contactId",updateContactForm);
// /api/contactForm/deleteContactForm
contactFormRoutes.delete("/deleteContactForm/:contactId",deleteContactForm);
