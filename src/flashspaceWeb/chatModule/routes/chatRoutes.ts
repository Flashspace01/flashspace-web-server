import { Router } from "express";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { getSessions, saveSession, deleteSession } from "../controllers/chatController";

const router = Router();

// Protect all chat routes with authentication middleware
router.use(AuthMiddleware.authenticate);

// ============ CHAT SESSIONS ============
router.get("/", getSessions);
router.post("/", saveSession);
router.delete("/:sessionId", deleteSession);

export default router;
