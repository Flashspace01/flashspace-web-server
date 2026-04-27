import { Request, Response } from "express";
import { TicketService } from "../services/ticket.service";
import { TicketCategory, TicketModel, TicketStatus } from "../models/Ticket";
import { UserRole } from "../../authModule/models/user.model";
import { getIO } from "../../../socket";

// Extend Request type locally if needed
interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    id: string;
    email: string;
    role: string;
  };
}

// User Controllers
export const createTicket = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "User not authenticated",
      });
    }

    const { subject, description, category, priority, attachments, bookingId } = req.body;

    if (!description || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Description must be at least 10 characters long.",
      });
    }

    const ticket = await TicketService.createTicket(userId, {
      subject,
      description,
      category,
      priority,
      attachments,
      bookingId,
    });

    // Notify admins
    console.log(`Emitting new_ticket_created to admin_feed for ticket: ${ticket._id}`);
    getIO().to("admin_feed").emit("new_ticket_created", ticket);

    // Notify the specific space partner (directed to their user feed)
    if (ticket.partnerId) {
      getIO().to(ticket.partnerId.toString()).emit("partner_new_ticket", { ticket });
    }

    // Notify the affiliate if this ticket is linked to an affiliate's coupon
    if ((ticket as any).affiliateId) {
      const affiliateRoomId = `affiliate_${(ticket as any).affiliateId.toString()}`;
      getIO().to(affiliateRoomId).emit("affiliate_new_ticket", { ticket });
    }

    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error creating ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create ticket",
      error: error.message,
    });
  }
};

export const getUserTickets = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "User not authenticated",
      });
    }

    const result = await TicketService.getUserTickets(userId, page, limit);

    res.status(200).json({
      success: true,
      message: "Tickets retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Error fetching user tickets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tickets",
      error: error.message,
    });
  }
};

export const getTicketById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;
    const ticketId = req.params.ticketId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "User not authenticated",
      });
    }

    const staffRoles = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SUPPORT,
      UserRole.SALES,
      UserRole.AFFILIATE_MANAGER,
      UserRole.SPACE_PARTNER_MANAGER
    ];

    const isStaff = staffRoles.includes(userRole as UserRole);

    // If user is staff, they can access any ticket
    // If user is regular user, they can only access their own tickets
    const ticket = await TicketService.getTicketById(
      ticketId,
      isStaff ? undefined : userId,
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
        error: "Ticket not found or access denied",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ticket retrieved successfully",
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error fetching ticket by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ticket",
      error: error.message,
    });
  }
};

export const replyToTicket = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;
    const ticketId = req.params.ticketId as string;
    const { message, attachments } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "User not authenticated",
      });
    }

    const sender = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SUPPORT,
      UserRole.SALES,
      UserRole.AFFILIATE_MANAGER,
      UserRole.SPACE_PARTNER_MANAGER
    ].includes(userRole as UserRole) ? "admin" : "user";

    const ticket = await TicketService.addReply(ticketId, {
      userId,
      sender,
      message,
      attachments,
    });

    // Emit socket event
    if (ticket && ticket.messages && ticket.messages.length > 0) {
      getIO()
        .to(ticketId)
        .emit("new_message", {
          ticketId,
          message: ticket.messages[ticket.messages.length - 1],
        });
    }

    res.status(200).json({
      success: true,
      message: "Reply added successfully",
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error replying to ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add reply",
      error: error.message,
    });
  }
};

export const submitTicketFeedback = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const ticketId = req.params.ticketId as string;
    const { rating, remarks } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Please provide a rating between 1 and 5",
      });
    }

    const ticket = await TicketService.submitTicketFeedback(ticketId, {
      rating: Number(rating),
      remarks,
    });

    // Emit socket event to notify participants
    getIO().to(ticketId).emit("ticket_updated", { ticketId, ticket });

    res.status(200).json({
      success: true,
      message: "Feedback submitted successfully",
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit feedback",
    });
  }
};

// Admin Controllers
export const getAllTickets = async (req: Request, res: Response) => {
  try {
    const {
      status,
      priority,
      category,
      assignee,
      search,
      page = "1",
      limit = "20",
    } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (category) filters.category = category;
    if (assignee) filters.assignee = assignee;
    if (search) filters.search = search as string;

    const result = await TicketService.getAllTickets(
      filters,
      parseInt(page as string),
      parseInt(limit as string),
    );

    res.status(200).json({
      success: true,
      message: "Tickets retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Error fetching all tickets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tickets",
      error: error.message,
    });
  }
};

export const getTicketStats = async (req: Request, res: Response) => {
  try {
    const stats = await TicketService.getTicketStats();

    res.status(200).json({
      success: true,
      message: "Ticket stats retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error fetching ticket stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ticket stats",
      error: error.message,
    });
  }
};

export const updateTicket = async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.ticketId as string;
    const updateData = req.body;

    const ticket = await TicketService.updateTicket(ticketId, updateData);

    res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error updating ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update ticket",
      error: error.message,
    });
  }
};

export const assignTicket = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const adminId = req.user?._id;
    const ticketId = req.params.ticketId as string;
    const { assigneeId } = req.body;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "Admin not authenticated",
      });
    }

    // Use provided assigneeId or assign to self if not provided
    const assignTo = assigneeId || adminId;

    const ticket = await TicketService.assignTicket(ticketId, assignTo);

    res.status(200).json({
      success: true,
      message: "Ticket assigned successfully",
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error assigning ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign ticket",
      error: error.message,
    });
  }
};

export const addAdminReply = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const adminId = req.user?._id;
    const ticketId = req.params.ticketId as string;
    const { message, attachments } = req.body;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "Admin not authenticated",
      });
    }

    const ticket = await TicketService.addAdminReply(
      ticketId,
      adminId,
      message,
      attachments,
    );

    // Emit socket event
    if (ticket && ticket.messages && ticket.messages.length > 0) {
      getIO()
        .to(ticketId)
        .emit("new_message", {
          ticketId,
          message: ticket.messages[ticket.messages.length - 1],
        });
    }

    res.status(200).json({
      success: true,
      message: "Reply added successfully",
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error adding admin reply:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add reply",
      error: error.message,
    });
  }
};

export const escalateTicket = async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.ticketId as string;

    const ticket = await TicketService.escalateTicket(ticketId);

    res.status(200).json({
      success: true,
      message: "Ticket escalated successfully",
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error escalating ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to escalate ticket",
      error: error.message,
    });
  }
};

export const resolveTicket = async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.ticketId as string;

    const ticket = await TicketService.resolveTicket(ticketId);

    // Emit socket event
    if (ticket) {
      getIO().to(ticketId).emit("ticket_updated", { ticketId, ticket });
    }

    res.status(200).json({
      success: true,
      message: "Ticket resolved successfully",
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error resolving ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve ticket",
      error: error.message,
    });
  }
};

export const closeTicket = async (req: Request, res: Response) => {
  try {
    const ticketId = req.params.ticketId as string;

    const ticket = await TicketService.closeTicket(ticketId);

    // Emit socket event
    if (ticket) {
      getIO().to(ticketId).emit("ticket_updated", { ticketId, ticket });
    }

    res.status(200).json({
      success: true,
      message: "Ticket closed successfully",
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error closing ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to close ticket",
      error: error.message,
    });
  }
};

// ============ PARTNER CONTROLLERS ============

export const getPartnerTickets = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const partnerId = req.user?._id || req.user?.id;
    if (!partnerId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await TicketService.getPartnerTickets(
      partnerId,
      page,
      limit,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error fetching partner tickets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tickets",
      error: error.message,
    });
  }
};

export const addPartnerReply = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const partnerId = req.user?._id || req.user?.id;
    if (!partnerId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { ticketId } = req.params as { ticketId: string };
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    const ticket = await TicketService.addPartnerReply(
      ticketId,
      partnerId,
      message,
    );

    // Emit socket event - emit the new message to the ticket room
    if (ticket && ticket.messages && ticket.messages.length > 0) {
      getIO()
        .to(ticketId)
        .emit("new_message", {
          ticketId,
          message: ticket.messages[ticket.messages.length - 1],
        });
    }

    res.status(200).json({
      success: true,
      message: "Reply sent successfully",
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error sending partner reply:", error);
    res.status(error.message.includes("access denied") ? 403 : 500).json({
      success: false,
      message: error.message || "Failed to send reply",
    });
  }
};

export const partnerCloseTicket = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const partnerId = req.user?._id || req.user?.id;
    if (!partnerId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { ticketId } = req.params as { ticketId: string };
    const ticket = await TicketService.partnerCloseTicket(ticketId, partnerId);

    // Emit socket event
    if (ticket) {
      getIO().to(ticketId).emit("ticket_updated", { ticketId, ticket });
    }

    res.status(200).json({
      success: true,
      message: "Ticket closed successfully",
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error closing ticket (partner):", error);
    res.status(error.message.includes("access denied") ? 403 : 500).json({
      success: false,
      message: error.message || "Failed to close ticket",
    });
  }
};

export const partnerMessageClient = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const partnerId = req.user?._id || req.user?.id;
    if (!partnerId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { clientUserId, bookingId, subject, message } = req.body;

    if (!clientUserId || !subject || !message) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const ticket = await TicketService.partnerMessageClient(partnerId, {
      clientUserId,
      bookingId,
      subject,
      message,
    });

    // Emit socket event
    if (ticket && ticket.messages && ticket.messages.length > 0) {
      getIO()
        .to(ticket._id.toString())
        .emit("new_message", {
          ticketId: ticket._id.toString(),
          message: ticket.messages[ticket.messages.length - 1],
        });
    }

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    console.error("Error messaging client:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send message",
    });
  }
};

// ============ AFFILIATE CONTROLLERS ============

export const getAffiliateTickets = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const affiliateId = req.user?._id || req.user?.id;
    if (!affiliateId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await TicketService.getAffiliateTickets(affiliateId, page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error fetching affiliate tickets:", error);
    res.status(500).json({ success: false, message: error.message || "Failed" });
  }
};

export const tapInToTicket = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role || "";
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const { ticketId } = req.params as { ticketId: string };
    const ticket = await TicketService.tapInToTicket(ticketId, userId, userRole);

    // Broadcast tap-in event to all room participants
    if (ticket) {
      getIO().to(ticketId).emit("tap_in", { ticketId, userId, role: userRole, ticket });
      // Also emit the tap-in system message as a new_message
      const lastMsg = ticket.messages?.[ticket.messages.length - 1];
      if (lastMsg) {
        getIO().to(ticketId).emit("new_message", { ticketId, message: lastMsg });
      }
    }

    res.status(200).json({ success: true, message: "Tapped in successfully", data: ticket });
  } catch (error: any) {
    console.error("Error tapping in:", error);
    res.status(error.message.includes("Access denied") ? 403 : 500).json({
      success: false,
      message: error.message || "Failed to tap in",
    });
  }
};

export const addAffiliateReply = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const affiliateId = req.user?._id || req.user?.id;
    if (!affiliateId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const { ticketId } = req.params as { ticketId: string };
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const ticket = await TicketService.addAffiliateReply(ticketId, affiliateId, message);

    if (ticket?.messages?.length) {
      getIO().to(ticketId).emit("new_message", {
        ticketId,
        message: ticket.messages[ticket.messages.length - 1],
      });
    }

    res.status(200).json({ success: true, message: "Reply sent", data: ticket });
  } catch (error: any) {
    console.error("Error sending affiliate reply:", error);
    res.status(error.message.includes("tap in") ? 403 : 500).json({
      success: false,
      message: error.message || "Failed to send reply",
    });
  }
};