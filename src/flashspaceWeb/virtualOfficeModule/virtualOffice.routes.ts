import { Router } from "express";
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
virtualOfficeRoutes.post("/create", createVirtualOffice);

// GET /api/virtualOffice/getAll
virtualOfficeRoutes.get("/getAll", getAllVirtualOffices);

// GET /api/virtualOffice/getByCity/:city
virtualOfficeRoutes.get("/getByCity/:city", getVirtualOfficesByCity);

// GET /api/virtualOffice/getById/:virtualOfficeId
virtualOfficeRoutes.get("/getById/:virtualOfficeId", getVirtualOfficeById);

// PUT /api/virtualOffice/update/:virtualOfficeId
virtualOfficeRoutes.put("/update/:virtualOfficeId", updateVirtualOffice);

// DELETE /api/virtualOffice/delete/:virtualOfficeId
virtualOfficeRoutes.delete("/delete/:virtualOfficeId", deleteVirtualOffice);

// --- Partner Portal Routes ---
// Protected Routes
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import { getPartnerVirtualOffices } from "./virtualOffice.controller";

virtualOfficeRoutes.get(
  "/partner/spaces",
  AuthMiddleware.authenticate,
  getPartnerVirtualOffices,
);
