import { Router } from "express";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import { UserRole } from "../authModule/models/user.model";
import {
  createCoworkingSpace,
  getAllCoworkingSpaces,
  getCoworkingSpaceById,
  getCoworkingSpacesByCity,
  updateCoworkingSpace,
  deleteCoworkingSpace,
  getPartnerSpaces,
  seedDummy,
  getUserCoworkingSpaces,
  getUserCoworkingSpacesByCity,
  getUserCoworkingSpaceById,
} from "./coworkingSpace.controller";
import multer from "multer";

const coworkingSpaceRoutes = Router({ mergeParams: true });
const upload = multer();

// POST /api/coworkingSpace/create
coworkingSpaceRoutes.post(
  "/create",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN),
  createCoworkingSpace,
);

// POST /api/coworkingSpace/seed-dummy
coworkingSpaceRoutes.post("/seed-dummy", seedDummy);

// GET /api/coworkingSpace/getAll
coworkingSpaceRoutes.get("/getAll", getAllCoworkingSpaces);

// GET /api/coworkingSpace/getByCity/:city
coworkingSpaceRoutes.get("/getByCity/:city", getCoworkingSpacesByCity);

// GET /api/coworkingSpace/getById/:coworkingSpaceId
coworkingSpaceRoutes.get("/getById/:coworkingSpaceId", getCoworkingSpaceById);

// --- User-Facing Routes (Active Only) ---
coworkingSpaceRoutes.get("/user/all", getUserCoworkingSpaces);
coworkingSpaceRoutes.get("/user/city/:city", getUserCoworkingSpacesByCity);
coworkingSpaceRoutes.get(
  "/user/id/:coworkingSpaceId",
  getUserCoworkingSpaceById,
);

// PUT /api/coworkingSpace/update/:coworkingSpaceId
coworkingSpaceRoutes.put(
  "/update/:coworkingSpaceId",
  AuthMiddleware.authenticate,
  updateCoworkingSpace,
);

// DELETE /api/coworkingSpace/delete/:coworkingSpaceId
coworkingSpaceRoutes.delete(
  "/delete/:coworkingSpaceId",
  AuthMiddleware.authenticate,
  deleteCoworkingSpace,
);

// --- Partner Portal Routes ---
// Protected Routes
coworkingSpaceRoutes.get(
  "/partner/spaces",
  AuthMiddleware.authenticate,
  getPartnerSpaces,
);

export { coworkingSpaceRoutes };
