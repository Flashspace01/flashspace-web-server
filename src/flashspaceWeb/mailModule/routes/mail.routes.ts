import { Router } from "express";
import {
  createMail,
  getMails,
  updateMailStatus,
  getUserMails,
} from "../controllers/mail.controller";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";

const router = Router();

router.post("/", createMail);
router.get("/", getMails);
router.get("/user", AuthMiddleware.authenticate, getUserMails);
router.patch("/:id/status", updateMailStatus);

export default router;
