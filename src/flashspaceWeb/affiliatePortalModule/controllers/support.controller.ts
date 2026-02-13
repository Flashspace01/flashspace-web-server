import { Request, Response } from "express";
import { SupportTicketModel, TicketStatus, TicketPriority, generateTicketId } from "../models/supportTicket.model";
import { Types } from "mongoose";

/**
 * Create a new support ticket
 */
export const createTicket = async (req: Request, res: Response): Promise<void> => {
    try {
        const affiliateId = req.user?.id;

        if (!affiliateId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
            return;
        }

        const { subject, priority, message } = req.body || {};
        const normalizedSubject =
            typeof subject === "string" && subject.trim()
                ? subject.trim()
                : `Support Request ${Date.now()}`;
        const normalizedMessage =
            typeof message === "string" && message.trim()
                ? message.trim()
                : "No additional message provided.";
        const normalizedPriority = Object.values(TicketPriority).includes(priority)
            ? priority
            : TicketPriority.MEDIUM;
        const maxAttempts = 3;
        let attempt = 0;
        let ticket: any = null;
        let lastError: any = null;

        while (attempt < maxAttempts) {
            attempt += 1;
            try {
                const ticketId = await generateTicketId();
                ticket = await SupportTicketModel.create({
                    affiliateId: new Types.ObjectId(affiliateId),
                    ticketId,
                    subject: normalizedSubject,
                    priority: normalizedPriority,
                    messages: [{
                        role: "user",
                        text: normalizedMessage,
                        timestamp: new Date()
                    }]
                });
                break;
            } catch (error: any) {
                lastError = error;
                if (error?.code === 11000) {
                    continue;
                }
                throw error;
            }
        }

        if (!ticket) {
            throw lastError || new Error("Failed to create support ticket");
        }

        res.status(201).json({
            success: true,
            message: "Support ticket created successfully",
            data: ticket,
        });
    } catch (error: any) {
        console.error("Create Ticket Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create ticket",
            error: error.message,
        });
    }
};

/**
 * Get all tickets for the affiliate
 */
export const getTickets = async (req: Request, res: Response): Promise<void> => {
    try {
        const affiliateId = req.user?.id;
        const isAdmin = req.user?.role === "admin";

        if (!affiliateId && !isAdmin) {
            res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
            return;
        }

        const filter = isAdmin
            ? {}
            : { affiliateId: new Types.ObjectId(affiliateId) };

        const tickets = await SupportTicketModel.find(filter).sort({
            createdAt: -1,
        });

        res.status(200).json({
            success: true,
            data: tickets,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Error fetching tickets",
            error: error.message,
        });
    }
};

/**
 * Chat endpoint for AI Assistant
 * Simulates an AI response based on keywords
 */
export const chat = async (req: Request, res: Response): Promise<void> => {
    try {
        const { message } = req.body;
        
        // Simple keyword-based AI logic
        let reply = "I've received your message and am looking into it.";
        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes("commission") || lowerMsg.includes("payment")) {
            reply = "For commission inquiries, please check the 'Earnings' tab. Payments are processed on the 1st of every month.";
        } else if (lowerMsg.includes("link") || lowerMsg.includes("referral")) {
            reply = "You can find your unique referral link on the dashboard home page. If it's not working, please try clearing your cache.";
        } else if (lowerMsg.includes("marketing") || lowerMsg.includes("material")) {
            reply = "Marketing materials are available in the 'Resources' section. We update them weekly.";
        } else if (lowerMsg.includes("hello") || lowerMsg.includes("hi")) {
            reply = "Hello! How can I assist you with your affiliate account today?";
        }

        // Simulate network delay
        setTimeout(() => {
             res.status(200).json({
                success: true,
                reply,
            });
        }, 500);

    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Chat service unavailable",
            error: error.message,
        });
    }
};
