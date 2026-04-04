import { Request, Response } from "express";
import ChatSession from "../models/ChatSession";
import axios from "axios";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "https://ai.flashspace.co/chat/guest";

// Send message to AI backend and return response
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { message, conversationId, sessionId } = req.body;
    
    // User identifier for the AI backend (either MongoDB _id or a session string)
    const userIdentifier = userId || sessionId || `anonymous_${Date.now()}`;
    
    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    console.log(`[CHAT] Running message for identifier: ${userIdentifier} (IsMember: ${!!userId})`);

    // Call AI backend
    const response = await axios.post(
      AI_BACKEND_URL,
      {
        query: message,
        conversation_id: conversationId || "default",
        session_id: userIdentifier
      },
      { timeout: 60000 }
    );

    const aiResponse = response.data;
    console.log(`[CHAT] AI backend response:`, aiResponse);

    // Extract reply from response
    const reply = aiResponse.reply || aiResponse.message || aiResponse.response || "No response from AI";

    res.status(200).json({
      success: true,
      reply,
      sessionId: aiResponse.session_id || userId
    });
  } catch (error: any) {
    console.error("[CHAT] Error calling AI backend:", error.message || error);
    res.status(500).json({
      success: false,
      message: "Failed to get response from AI assistant"
    });
  }
};

// Send message to AI backend (Guest users)
export const sendGuestMessage = async (req: Request, res: Response) => {
  console.log("[CHAT-GUEST] Received guest chat request");
  try {
    const { message, conversationId, sessionId } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    console.log(`[CHAT-GUEST] Sending message to AI: "${message}"`);

    const response = await axios.post(
      AI_BACKEND_URL,
      {
        query: message,
        conversation_id: conversationId || "guest_web",
        session_id: sessionId || `guest_${Date.now()}`
      },
      { timeout: 60000 }
    );

    res.status(200).json({
      success: true,
      reply: response.data.reply,
      sessionId: response.data.session_id
    });
  } catch (error: any) {
    console.error("[CHAT-GUEST] Error calling AI backend:", error.message);
    res.status(500).json({
      success: false,
      message: "AI assistant is currently unavailable"
    });
  }
};

// Get all chat sessions for the authenticated user
export const getSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const sessions = await ChatSession.find({ user: userId }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    res.status(500).json({ success: false, message: "Failed to fetch chat sessions" });
  }
};

// Save or update a chat session
export const saveSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { _id, id, title, messages, date } = req.body;
    const sessionId = _id || id; // Frontend may send either

    // Strip frontend-only fields (isTyping) before persisting to avoid re-triggering
    // typewriter animation when sessions are reloaded from DB.
    const cleanMessages = Array.isArray(messages)
      ? messages.map(({ isTyping: _ignored, ...msg }: any) => msg)
      : messages;

    console.log(`[CHAT] Save request — sessionId: ${sessionId}, messages: ${messages?.length}`);

    if (!cleanMessages || cleanMessages.length === 0) {
      return res.status(400).json({ success: false, message: "Messages are required." });
    }

    // Try to find existing session by MongoDB _id
    let existingSession;
    if (sessionId && sessionId.length === 24) {
      existingSession = await ChatSession.findOne({ _id: sessionId, user: userId });
    }

    if (existingSession) {
      existingSession.title = title || existingSession.title;
      existingSession.messages = cleanMessages;
      existingSession.date = date || existingSession.date;
      await existingSession.save();
      console.log(`[CHAT] Updated existing session: ${existingSession._id}`);
      
      return res.status(200).json({
        success: true,
        data: existingSession,
      });
    }

    // Create new session
    const newSession = new ChatSession({
      user: userId,
      title: title || "Chat session",
      messages: cleanMessages,
      date: date || new Date().toLocaleDateString(),
    });

    await newSession.save();
    console.log(`[CHAT] Created new session: ${newSession._id}`);

    res.status(201).json({
      success: true,
      data: newSession,
    });
  } catch (error) {
    console.error(`[CHAT] Error saving chat session:`, error);
    res.status(500).json({ success: false, message: "Failed to save chat session" });
  }
};

// Delete a chat session
export const deleteSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const session = await ChatSession.findOneAndDelete({ _id: sessionId, user: userId });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.status(200).json({
      success: true,
      message: "Chat session deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting chat session:", error);
    res.status(500).json({ success: false, message: "Failed to delete chat session" });
  }
};
