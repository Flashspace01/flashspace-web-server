import { Router } from "express";
import {
  getVisits,
  getUserVisits,
  createVisit,
  updateVisitStatus,
} from "../controllers/visit.controller";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";

const router = Router();

router.get("/", getVisits);
router.get("/user", AuthMiddleware.authenticate, getUserVisits);
router.post("/", createVisit);
router.patch("/:id/status", updateVisitStatus);

export default router;
