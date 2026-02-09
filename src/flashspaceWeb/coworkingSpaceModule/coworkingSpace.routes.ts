import { Router } from "express";
import {
    createCoworkingSpace,
    getAllCoworkingSpaces,
    getCoworkingSpaceById,
    getCoworkingSpacesByCity,
    updateCoworkingSpace,
    deleteCoworkingSpace
} from "./coworkingSpace.controller";
import { readRateLimiter } from "../../config/rateLimiter.config";

export const coworkingSpaceRoutes = Router();

// POST /api/coworkingSpace/create
coworkingSpaceRoutes.post("/create", createCoworkingSpace);

// GET /api/coworkingSpace/getAll
coworkingSpaceRoutes.get("/getAll", readRateLimiter, getAllCoworkingSpaces);

// GET /api/coworkingSpace/getByCity/:city
coworkingSpaceRoutes.get("/getByCity/:city", readRateLimiter, getCoworkingSpacesByCity);

// GET /api/coworkingSpace/getById/:coworkingSpaceId
coworkingSpaceRoutes.get("/getById/:coworkingSpaceId", readRateLimiter, getCoworkingSpaceById);

// PUT /api/coworkingSpace/update/:coworkingSpaceId
coworkingSpaceRoutes.put("/update/:coworkingSpaceId", updateCoworkingSpace);

// DELETE /api/coworkingSpace/delete/:coworkingSpaceId
coworkingSpaceRoutes.delete("/delete/:coworkingSpaceId", deleteCoworkingSpace);
