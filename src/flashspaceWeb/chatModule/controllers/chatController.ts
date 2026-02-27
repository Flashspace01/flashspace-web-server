import { Request, Response } from "express";
import ChatSession from "../models/ChatSession";

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

    console.log(`[CHAT] Save request — sessionId: ${sessionId}, messages: ${messages?.length}`);

    if (!messages || messages.length === 0) {
      return res.status(400).json({ success: false, message: "Messages are required." });
    }

    // Try to find existing session by MongoDB _id
    let existingSession;
    if (sessionId && sessionId.length === 24) {
      existingSession = await ChatSession.findOne({ _id: sessionId, user: userId });
    }

    if (existingSession) {
      existingSession.title = title || existingSession.title;
      existingSession.messages = messages;
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
      messages,
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
