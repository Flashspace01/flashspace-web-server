import { Request, Response } from "express";
import ChatSession from "../models/ChatSession";
import axios from "axios";

// ✅ FIXED: correct base URL (NO trailing /chat/guest here)
const AI_BASE_URL =
  process.env.AI_BACKEND_URL || "https://ai.flashspace.co";

// ================= SEND MESSAGE (AUTH + OPTIONAL) =================
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { message, conversationId, sessionId } = req.body;

    const userIdentifier =
      userId || sessionId || `anonymous_${Date.now()}`;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    console.log(
      `[CHAT] Identifier: ${userIdentifier} | Member: ${!!userId}`
    );

    // ✅ FIXED endpoint
    const targetUrl = `${AI_BASE_URL}/chat`;

    const response = await axios.post(
      targetUrl,
      {
        query: message,
        conversation_id: conversationId || "default",
        session_id: userIdentifier,
      },
      {
        timeout: 90000,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const aiResponse = response.data;

    const reply =
      aiResponse.reply ||
      aiResponse.message ||
      aiResponse.response ||
      (typeof aiResponse === "string"
        ? aiResponse
        : "No response from AI");

    return res.status(200).json({
      success: true,
      reply,
      sessionId: aiResponse.session_id || userIdentifier,
    });
  } catch (error: any) {
    const status = error.response?.status || 500;
    const errorMsg =
      error.response?.data?.message ||
      error.message ||
      "Unknown error";

    console.error(`[CHAT] Error (${status}):`, errorMsg);

    return res.status(status).json({
      success: false,
      message: "Failed to get response from AI assistant",
      error: errorMsg,
    });
  }
};

// ================= GUEST MESSAGE (NO AUTH) =================
export const sendGuestMessage = async (req: Request, res: Response) => {
  console.log("[CHAT-GUEST] Request received");

  try {
    const { message, conversationId, sessionId } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    // ✅ FIXED endpoint (THIS WAS YOUR MAIN BUG)
    const targetUrl = `${AI_BASE_URL}/chat/guest`;

    console.log(`[CHAT-GUEST] Calling: ${targetUrl}`);

    const response = await axios.post(
      targetUrl,
      {
        query: message, // ✅ IMPORTANT (not "message")
        conversation_id: conversationId || "guest_web",
        session_id: sessionId || `guest_${Date.now()}`,
      },
      {
        timeout: 60000,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const aiResponse = response.data;

    const reply =
      aiResponse.reply ||
      aiResponse.message ||
      aiResponse.response ||
      (typeof aiResponse === "string"
        ? aiResponse
        : "No response from AI");

    return res.status(200).json({
      success: true,
      reply,
      sessionId: aiResponse.session_id,
    });
  } catch (error: any) {
    const status = error.response?.status || 500;

    console.error("[CHAT-GUEST] Error:", error.message);
    if (error.response?.data) {
      console.error(
        "[CHAT-GUEST] Details:",
        JSON.stringify(error.response.data)
      );
    }

    return res.status(status).json({
      success: false,
      message: "AI assistant is currently unavailable",
      error: error.message,
    });
  }
};

// ================= GET SESSIONS =================
export const getSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const sessions = await ChatSession.find({ user: userId }).sort({
      updatedAt: -1,
    });

    return res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch sessions" });
  }
};

// ================= SAVE SESSION =================
export const saveSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const { _id, id, title, messages, date } = req.body;
    const sessionId = _id || id;

    const cleanMessages = Array.isArray(messages)
      ? messages.map(({ isTyping: _ignored, ...msg }: any) => msg)
      : messages;

    if (!cleanMessages || cleanMessages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Messages are required.",
      });
    }

    let existingSession;
    if (sessionId && sessionId.length === 24) {
      existingSession = await ChatSession.findOne({
        _id: sessionId,
        user: userId,
      });
    }

    if (existingSession) {
      existingSession.title = title || existingSession.title;
      existingSession.messages = cleanMessages;
      existingSession.date = date || existingSession.date;

      await existingSession.save();

      return res.status(200).json({
        success: true,
        data: existingSession,
      });
    }

    const newSession = new ChatSession({
      user: userId,
      title: title || "Chat session",
      messages: cleanMessages,
      date: date || new Date().toLocaleDateString(),
    });

    await newSession.save();

    return res.status(201).json({
      success: true,
      data: newSession,
    });
  } catch (error) {
    console.error("Save session error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to save session" });
  }
};

// ================= DELETE SESSION =================
export const deleteSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    const session = await ChatSession.findOneAndDelete({
      _id: sessionId,
      user: userId,
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Chat session deleted successfully",
    });
  } catch (error) {
    console.error("Delete session error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete session" });
  }
};