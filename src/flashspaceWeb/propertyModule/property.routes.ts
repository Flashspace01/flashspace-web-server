import { Router } from "express";
import * as PropertyController from "./property.controller";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";

export const propertyRoutes = Router();

// Protected routes (Partner/Admin)
propertyRoutes.get(
  "/partner/all",
  AuthMiddleware.authenticate,
  PropertyController.getPartnerProperties,
);

// Public routes
propertyRoutes.get("/:propertyId", PropertyController.getPropertyById);
propertyRoutes.get("/:propertyId/spaces", PropertyController.getPropertySpaces);

// Protected routes (Partner/Admin)
propertyRoutes.post(
  "/create",
  AuthMiddleware.authenticate,
  PropertyController.createProperty,
);

propertyRoutes.put(
  "/update/:propertyId",
  AuthMiddleware.authenticate,
  PropertyController.updateProperty,
);

propertyRoutes.delete(
  "/delete/:propertyId",
  AuthMiddleware.authenticate,
  PropertyController.deleteProperty,
);
