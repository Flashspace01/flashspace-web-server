import { Router } from "express";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import { postReview } from "./review.controller";

const reviewRoutes = Router({ mergeParams: true });

// POST /api/reviews/add
reviewRoutes.post("/add", AuthMiddleware.authenticate, postReview);

export { reviewRoutes };
