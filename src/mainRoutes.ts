import {Router} from "express";
import {contactFormRoutes} from "./flashspaceWeb/contactFormModule/contactForm.routes"

export const mainRoutes=Router();

mainRoutes.use("/contactForm",contactFormRoutes);
// mainRoutes.use("/spacePartners",spacePartnersRoutes);


