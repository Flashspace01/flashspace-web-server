import { Request, Response } from "express";
import { TicketService } from "../services/ticket.service";
import { TicketCategory, TicketModel, TicketStatus } from "../models/Ticket";
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
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "User not authenticated",
      });
    }

    const { subject, description, category, priority, attachments } = req.body;

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
    });

    // Notify admins
    console.log(
      `Emitting new_ticket_created to admin_feed for ticket: ${ticket._id}`,
    );
    getIO().to("admin_feed").emit("new_ticket_created", ticket);

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
    const userId = req.user?._id;
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
    const userId = req.user?._id;
    const userRole = req.user?.role;
    const ticketId = req.params.ticketId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        error: "User not authenticated",
      });
    }

    // If user is admin, they can access any ticket
    // If user is regular user, they can only access their own tickets
    const ticket = await TicketService.getTicketById(
      ticketId,
      userRole === "admin" ? undefined : userId,
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
    const userId = req.user?._id;
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

    const sender = userRole === "admin" ? "admin" : "user";

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
