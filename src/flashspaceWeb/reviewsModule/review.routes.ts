import { Router } from "express";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import {
  postReview,
  getSpaceReviews,
  getAllReviews,
  getNpsStats,
  getAiInsight,
  getPartnerReviews,
  getPartnerNpsStats,
} from "./review.controller";

const reviewRoutes = Router({ mergeParams: true });

// POST /api/v1/reviews/add (Protected)
reviewRoutes.post("/add", AuthMiddleware.authenticate, postReview);

// GET /api/v1/reviews/space/:spaceId (Public)
reviewRoutes.get("/space/:spaceId", getSpaceReviews);

// NEW: Space Partner / Admin routes
reviewRoutes.get("/getAll", getAllReviews);
reviewRoutes.get("/nps", getNpsStats);
reviewRoutes.get("/ai-insight", getAiInsight);

// Partner-scoped routes (authenticated)
reviewRoutes.get("/partner", AuthMiddleware.authenticate, getPartnerReviews);
reviewRoutes.get(
  "/partner/nps",
  AuthMiddleware.authenticate,
  getPartnerNpsStats,
);

export { reviewRoutes };
