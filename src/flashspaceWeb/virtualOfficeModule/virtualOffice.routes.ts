import { Router } from "express";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import {
  createVirtualOffice,
  getAllVirtualOffices,
  getVirtualOfficeById,
  getVirtualOfficesByCity,
  updateVirtualOffice,
  deleteVirtualOffice,
} from "./virtualOffice.controller";

export const virtualOfficeRoutes = Router();

// POST /api/virtualOffice/create
virtualOfficeRoutes.post(
  "/create",
  AuthMiddleware.authenticate,
  createVirtualOffice,
);

// GET /api/virtualOffice/getAll
virtualOfficeRoutes.get("/getAll", getAllVirtualOffices);

// GET /api/virtualOffice/getByCity/:city
virtualOfficeRoutes.get("/getByCity/:city", getVirtualOfficesByCity);

// GET /api/virtualOffice/getById/:virtualOfficeId
virtualOfficeRoutes.get("/getById/:virtualOfficeId", getVirtualOfficeById);

// PUT /api/virtualOffice/update/:virtualOfficeId
virtualOfficeRoutes.put(
  "/update/:virtualOfficeId",
  AuthMiddleware.authenticate,
  updateVirtualOffice,
);

// DELETE /api/virtualOffice/delete/:virtualOfficeId
virtualOfficeRoutes.delete(
  "/delete/:virtualOfficeId",
  AuthMiddleware.authenticate,
  deleteVirtualOffice,
);

// --- Partner Portal Routes ---
// Protected Routes
import { getPartnerVirtualOffices } from "./virtualOffice.controller";

virtualOfficeRoutes.get(
  "/partner/spaces",
  AuthMiddleware.authenticate,
  getPartnerVirtualOffices,
);
