import { Router } from "express";
import {
    createVirtualOffice,
    getAllVirtualOffices,
    getVirtualOfficeById,
    getVirtualOfficesByCity,
    updateVirtualOffice,
    deleteVirtualOffice
} from "./virtualOffice.controller";
import { readRateLimiter } from "../../config/rateLimiter.config";

export const virtualOfficeRoutes = Router();

// POST /api/virtualOffice/create
virtualOfficeRoutes.post("/create", createVirtualOffice);

// GET /api/virtualOffice/getAll
virtualOfficeRoutes.get("/getAll", readRateLimiter, getAllVirtualOffices);

// GET /api/virtualOffice/getByCity/:city
virtualOfficeRoutes.get("/getByCity/:city", readRateLimiter, getVirtualOfficesByCity);

// GET /api/virtualOffice/getById/:virtualOfficeId
virtualOfficeRoutes.get("/getById/:virtualOfficeId", readRateLimiter, getVirtualOfficeById);

// PUT /api/virtualOffice/update/:virtualOfficeId
virtualOfficeRoutes.put("/update/:virtualOfficeId", updateVirtualOffice);

// DELETE /api/virtualOffice/delete/:virtualOfficeId
virtualOfficeRoutes.delete("/delete/:virtualOfficeId", deleteVirtualOffice);
