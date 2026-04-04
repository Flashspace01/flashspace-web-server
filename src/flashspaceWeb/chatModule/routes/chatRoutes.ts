import { Router } from "express";
import { AuthMiddleware } from "../../authModule/middleware/auth.middleware";
import { sendMessage, sendGuestMessage, getSessions, saveSession, deleteSession } from "../controllers/chatController";

const router = Router();

// ============ CHAT MESSAGING (PUBLIC/OPTIONAL AUTH) ============
router.post("/guest", sendGuestMessage);
router.post(["/send", "/send/"], AuthMiddleware.optionalAuth, sendMessage);

// Protect subsequent chat routes (sessions, history) with mandatory authentication
router.use(AuthMiddleware.authenticate);

// ============ CHAT SESSIONS ============
router.get("/", getSessions);
router.post("/", saveSession);
router.delete("/:sessionId", deleteSession);

export default router;
