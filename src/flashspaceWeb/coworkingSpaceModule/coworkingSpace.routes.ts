import { Router } from "express";
import {
    createCoworkingSpace,
    getAllCoworkingSpaces,
    getCoworkingSpaceById,
    getCoworkingSpacesByCity,
    updateCoworkingSpace,
    deleteCoworkingSpace
} from "./coworkingSpace.controller";

export const coworkingSpaceRoutes = Router();

// POST /api/coworkingSpace/create
coworkingSpaceRoutes.post("/create", createCoworkingSpace);

// GET /api/coworkingSpace/getAll
coworkingSpaceRoutes.get("/getAll", getAllCoworkingSpaces);

// GET /api/coworkingSpace/getByCity/:city
coworkingSpaceRoutes.get("/getByCity/:city", getCoworkingSpacesByCity);

// GET /api/coworkingSpace/getById/:coworkingSpaceId
coworkingSpaceRoutes.get("/getById/:coworkingSpaceId", getCoworkingSpaceById);

// PUT /api/coworkingSpace/update/:coworkingSpaceId
coworkingSpaceRoutes.put("/update/:coworkingSpaceId", updateCoworkingSpace);

// DELETE /api/coworkingSpace/delete/:coworkingSpaceId
coworkingSpaceRoutes.delete("/delete/:coworkingSpaceId", deleteCoworkingSpace);
