import { TicketModel, Ticket, TicketStatus, TicketPriority, TicketCategory } from "../models/Ticket";
import { UserModel } from "../../authModule/models/user.model";
import { Types } from "mongoose";

export interface CreateTicketDTO {
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  attachments?: string[];
}

export interface UpdateTicketDTO {
  status?: TicketStatus;
  assignee?: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  deadline?: Date;
}

export interface ReplyDTO {
  userId: string;
  sender: 'user' | 'admin';
  message: string;
  attachments?: string[];
}

export class TicketService {
  // User Methods
  static async createTicket(userId: string, data: CreateTicketDTO): Promise<any> {
    const ticketNumber = Ticket.generateTicketNumber();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const ticket = await TicketModel.create({
      ticketNumber,
      subject: data.subject,
      description: data.description,
      user: new Types.ObjectId(userId),
      category: data.category,
      priority: data.priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      attachments: data.attachments || [],
      messages: [{
        sender: 'user',
        message: data.description,
        createdAt: new Date()
      }],
      expiresAt
    });

    // Populate user data
    const populatedTicket = await TicketModel.findById(ticket._id)
      .populate('user', 'fullName email phoneNumber')
      .lean();

    return populatedTicket;
  }

  static async getUserTickets(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      TicketModel.find({ user: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('assignee', 'fullName email')
        .lean(),
      TicketModel.countDocuments({ user: new Types.ObjectId(userId) })
    ]);

    return {
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    };
  }

  static async getTicketById(ticketId: string, userId?: string) {
    try {
      const query: any = { _id: new Types.ObjectId(ticketId) };
      
      // If userId is provided, ensure user can only access their own tickets
      if (userId) {
        query.user = new Types.ObjectId(userId);
      }

      const ticket = await TicketModel.findOne(query)
        .populate('user', 'fullName email phoneNumber')
        .populate('assignee', 'fullName email')
        .lean();

      return ticket;
    } catch (error) {
      console.error('Error in getTicketById:', error);
      return null;
    }
  }

  static async addReply(ticketId: string, data: ReplyDTO) {
    const query: any = { _id: new Types.ObjectId(ticketId) };
    
    // If sender is user, ensure they own the ticket
    if (data.sender === 'user') {
      query.user = new Types.ObjectId(data.userId);
    }

    const ticket = await TicketModel.findOne(query);

    if (!ticket) {
      throw new Error('Ticket not found or access denied');
    }

    // Add the message
    ticket.messages.push({
      sender: data.sender,
      message: data.message,
      attachments: data.attachments,
      createdAt: new Date()
    });

    // Update status if it was closed/resolved and user is replying
    if (data.sender === 'user' && 
        (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.RESOLVED)) {
      ticket.status = TicketStatus.OPEN;
    }

    // Reset expiry on new activity
    ticket.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await ticket.save();
    
    // Return populated ticket
    return await TicketModel.findById(ticket._id)
      .populate('user', 'fullName email phoneNumber')
      .populate('assignee', 'fullName email')
      .lean();
  }

  // Admin Methods
  static async getAllTickets(filters: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
    assignee?: string;
    search?: string;
  } = {}, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Apply filters
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.category) query.category = filters.category;
    if (filters.assignee) query.assignee = new Types.ObjectId(filters.assignee);

    // Search by ticket number or subject
    if (filters.search) {
      query.$or = [
        { ticketNumber: { $regex: filters.search, $options: 'i' } },
        { subject: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const [tickets, total] = await Promise.all([
      TicketModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'fullName email phoneNumber')
        .populate('assignee', 'fullName email')
        .lean(),
      TicketModel.countDocuments(query)
    ]);

    return {
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    };
  }

  static async getTicketStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [
      statusCounts,
      priorityCounts,
      categoryCounts,
      totalTickets,
      resolvedThisMonth
    ] = await Promise.all([
      TicketModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      TicketModel.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ]),
      TicketModel.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ]),
      TicketModel.countDocuments({}),
      TicketModel.countDocuments({
        status: TicketStatus.RESOLVED,
        resolvedAt: { $gte: startOfMonth }
      })
    ]);

    return {
      statusCounts,
      priorityCounts,
      categoryCounts,
      totalTickets: [{ count: totalTickets }],
      resolvedThisMonth: [{ count: resolvedThisMonth }]
    };
  }

  static async updateTicket(ticketId: string, data: UpdateTicketDTO) {
    const updateObj: any = {};
    
    if (data.status) updateObj.status = data.status;
    if (data.assignee) updateObj.assignee = new Types.ObjectId(data.assignee);
    if (data.priority) updateObj.priority = data.priority;
    if (data.category) updateObj.category = data.category;
    if (data.deadline) updateObj.deadline = data.deadline;
    
    // If status is resolved, set resolvedAt
    if (data.status === TicketStatus.RESOLVED) {
      updateObj.resolvedAt = new Date();
    }
    // If status is closed, set closedAt
    else if (data.status === TicketStatus.CLOSED) {
      updateObj.closedAt = new Date();
    }

    const ticket = await TicketModel.findByIdAndUpdate(
      new Types.ObjectId(ticketId),
      updateObj,
      { new: true }
    )
    .populate('user', 'fullName email phoneNumber')
    .populate('assignee', 'fullName email');

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket;
  }

  static async addAdminReply(ticketId: string, adminId: string, message: string, attachments?: string[]) {
    const ticket = await TicketModel.findById(ticketId);
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Add admin message
    ticket.messages.push({
      sender: 'admin',
      message,
      attachments,
      createdAt: new Date()
    });

    // Update status if needed
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }

    // Assign to admin if not assigned
    if (!ticket.assignee) {
      ticket.assignee = new Types.ObjectId(adminId);
    }

    await ticket.save();
    
    // Return populated ticket
    return await TicketModel.findById(ticket._id)
      .populate('user', 'fullName email phoneNumber')
      .populate('assignee', 'fullName email')
      .lean();
  }

  static async assignTicket(ticketId: string, assigneeId: string) {
    const ticket = await TicketModel.findByIdAndUpdate(
      ticketId,
      {
        assignee: new Types.ObjectId(assigneeId),
        status: TicketStatus.IN_PROGRESS
      },
      { new: true }
    )
    .populate('user', 'fullName email phoneNumber')
    .populate('assignee', 'fullName email');

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket;
  }

  static async escalateTicket(ticketId: string) {
    const ticket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { status: TicketStatus.ESCALATED },
      { new: true }
    )
    .populate('user', 'fullName email phoneNumber')
    .populate('assignee', 'fullName email');

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket;
  }

  static async resolveTicket(ticketId: string) {
    const ticket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { 
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date()
      },
      { new: true }
    )
    .populate('user', 'fullName email phoneNumber')
    .populate('assignee', 'fullName email');

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket;
  }

  static async closeTicket(ticketId: string) {
    const ticket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { 
        status: TicketStatus.CLOSED,
        closedAt: new Date()
      },
      { new: true }
    )
    .populate('user', 'fullName email phoneNumber')
    .populate('assignee', 'fullName email');

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket;
  }
}