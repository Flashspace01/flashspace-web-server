import { Router } from "express";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import { postReview, getSpaceReviews } from "./review.controller";

const reviewRoutes = Router({ mergeParams: true });

// POST /api/v1/reviews/add (Protected)
reviewRoutes.post("/add", AuthMiddleware.authenticate, postReview);

// GET /api/v1/reviews/space/:spaceId (Public)
reviewRoutes.get("/space/:spaceId", getSpaceReviews);

export { reviewRoutes };
