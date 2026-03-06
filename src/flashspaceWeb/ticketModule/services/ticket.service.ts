import {
  TicketModel,
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "../models/Ticket";
import { UserModel } from "../../authModule/models/user.model";
import { Types } from "mongoose";
import { NotificationService } from "../../notificationModule/services/notification.service";
import { NotificationType } from "../../notificationModule/models/Notification";
import { BookingModel } from "../../bookingModule/booking.model";

export interface CreateTicketDTO {
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  attachments?: string[];
  bookingId?: string;
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
  sender: "user" | "admin" | "partner" | "affiliate";
  message: string;
  attachments?: string[];
}

export class TicketService {
  // ============ USER METHODS ============

  static async createTicket(userId: string, data: CreateTicketDTO): Promise<any> {
    const ticketNumber = Ticket.generateTicketNumber();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    let chatType: "user_admin" | "user_partner" = "user_admin";
    let affiliateId: Types.ObjectId | undefined = undefined;

    if (data.bookingId) {
      const booking = (await BookingModel.findById(data.bookingId).lean()) as any;
      if (booking) {
        chatType = "user_partner";
        if (booking.affiliateId) {
          affiliateId = new Types.ObjectId(booking.affiliateId.toString());
        }
      }
    }

    const ticket = await TicketModel.create({
      ticketNumber,
      subject: data.subject,
      description: data.description,
      user: new Types.ObjectId(userId),
      category: data.category,
      priority: data.priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      attachments: data.attachments || [],
      bookingId: data.bookingId ? new Types.ObjectId(data.bookingId) : undefined,
      chatType,
      affiliateId,
      tappedIn: [],
      messages: [{ sender: "user", message: data.description, createdAt: new Date() }],
      expiresAt,
    });

    const populatedTicket = await TicketModel.findById(ticket._id)
      .populate("user", "fullName email phoneNumber")
      .lean();

    NotificationService.notifyAdmin(
      `New Ticket: ${ticketNumber}`,
      `A new ticket "${data.subject}" has been created.`,
      NotificationType.INFO,
      { ticketId: ticket._id },
    );

    return populatedTicket;
  }

  static async getUserTickets(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      TicketModel.find({ user: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("assignee", "fullName email")
        .lean(),
      TicketModel.countDocuments({ user: new Types.ObjectId(userId) }),
    ]);

    return {
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  static async getTicketById(ticketId: string, userId?: string) {
    try {
      const query: any = { _id: new Types.ObjectId(ticketId) };
      if (userId) query.user = new Types.ObjectId(userId);

      return await TicketModel.findOne(query)
        .populate("user", "fullName email phoneNumber")
        .populate("assignee", "fullName email")
        .lean();
    } catch (error) {
      console.error("Error in getTicketById:", error);
      return null;
    }
  }

  static async addReply(ticketId: string, data: ReplyDTO) {
    const query: any = { _id: new Types.ObjectId(ticketId) };
    if (data.sender === "user") query.user = new Types.ObjectId(data.userId);

    const ticket = await TicketModel.findOne(query);
    if (!ticket) throw new Error("Ticket not found or access denied");

    ticket.messages.push({
      sender: data.sender,
      message: data.message,
      attachments: data.attachments,
      createdAt: new Date(),
    });

    if (
      data.sender === "user" &&
      (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.RESOLVED)
    ) {
      ticket.status = TicketStatus.OPEN;
    }

    ticket.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await ticket.save();

    if (data.sender === "user") {
      NotificationService.notifyAdmin(
        `New Reply on Ticket: ${ticket.ticketNumber}`,
        `User replied: ${data.message.substring(0, 50)}...`,
        NotificationType.TICKET_UPDATE,
        { ticketId: ticket._id },
      );
    }

    return await TicketModel.findById(ticket._id)
      .populate("user", "fullName email phoneNumber")
      .populate("assignee", "fullName email")
      .lean();
  }

  // ============ ADMIN METHODS ============

  static async getAllTickets(
    filters: {
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: TicketCategory;
      assignee?: string;
      search?: string;
    } = {},
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.category) query.category = filters.category;
    if (filters.assignee) query.assignee = new Types.ObjectId(filters.assignee);
    if (filters.search) {
      query.$or = [
        { ticketNumber: { $regex: filters.search, $options: "i" } },
        { subject: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
      ];
    }

    const [tickets, total] = await Promise.all([
      TicketModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName email phoneNumber")
        .populate("assignee", "fullName email")
        .lean(),
      TicketModel.countDocuments(query),
    ]);

    return {
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  static async getTicketStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [statusCounts, priorityCounts, categoryCounts, totalTickets, resolvedThisMonth] =
      await Promise.all([
        TicketModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        TicketModel.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
        TicketModel.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
        TicketModel.countDocuments({}),
        TicketModel.countDocuments({
          status: TicketStatus.RESOLVED,
          resolvedAt: { $gte: startOfMonth },
        }),
      ]);

    return {
      statusCounts,
      priorityCounts,
      categoryCounts,
      totalTickets: [{ count: totalTickets }],
      resolvedThisMonth: [{ count: resolvedThisMonth }],
    };
  }

  static async updateTicket(ticketId: string, data: UpdateTicketDTO) {
    const updateObj: any = {};

    if (data.status) updateObj.status = data.status;
    if (data.assignee) updateObj.assignee = new Types.ObjectId(data.assignee);
    if (data.priority) updateObj.priority = data.priority;
    if (data.category) updateObj.category = data.category;
    if (data.deadline) updateObj.deadline = data.deadline;

    if (data.status === TicketStatus.RESOLVED) updateObj.resolvedAt = new Date();
    else if (data.status === TicketStatus.CLOSED) updateObj.closedAt = new Date();

    const ticket = await TicketModel.findByIdAndUpdate(
      new Types.ObjectId(ticketId),
      updateObj,
      { new: true },
    )
      .populate("user", "fullName email phoneNumber")
      .populate("assignee", "fullName email");

    if (!ticket) throw new Error("Ticket not found");
    return ticket;
  }

  static async addAdminReply(
    ticketId: string,
    adminId: string,
    message: string,
    attachments?: string[],
  ) {
    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    ticket.messages.push({ sender: "admin", message, attachments, createdAt: new Date() });

    if (ticket.status === TicketStatus.OPEN) ticket.status = TicketStatus.IN_PROGRESS;
    if (!ticket.assignee) ticket.assignee = new Types.ObjectId(adminId);

    await ticket.save();

    NotificationService.notifyUser(
      ticket.user.toString(),
      `Update on Ticket: ${ticket.ticketNumber}`,
      `Admin replied: ${message.substring(0, 50)}...`,
      NotificationType.TICKET_UPDATE,
      { ticketId: ticket._id },
    );

    return await TicketModel.findById(ticket._id)
      .populate("user", "fullName email phoneNumber")
      .populate("assignee", "fullName email")
      .lean();
  }

  static async assignTicket(ticketId: string, assigneeId: string) {
    const ticket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { assignee: new Types.ObjectId(assigneeId), status: TicketStatus.IN_PROGRESS },
      { new: true },
    )
      .populate("user", "fullName email phoneNumber")
      .populate("assignee", "fullName email");

    if (!ticket) throw new Error("Ticket not found");
    return ticket;
  }

  static async escalateTicket(ticketId: string) {
    const ticket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { status: TicketStatus.ESCALATED },
      { new: true },
    )
      .populate("user", "fullName email phoneNumber")
      .populate("assignee", "fullName email");

    if (!ticket) throw new Error("Ticket not found");
    return ticket;
  }

  static async resolveTicket(ticketId: string) {
    const ticket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { status: TicketStatus.RESOLVED, resolvedAt: new Date() },
      { new: true },
    )
      .populate("user", "fullName email phoneNumber")
      .populate("assignee", "fullName email");

    if (!ticket) throw new Error("Ticket not found");

    NotificationService.notifyUser(
      ticket.user._id.toString(),
      `Ticket Resolved: ${ticket.ticketNumber}`,
      `Your ticket has been marked as resolved.`,
      NotificationType.SUCCESS,
      { ticketId: ticket._id },
    );

    return ticket;
  }

  static async closeTicket(ticketId: string) {
    const ticket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { status: TicketStatus.CLOSED, closedAt: new Date() },
      { new: true },
    )
      .populate("user", "fullName email phoneNumber")
      .populate("assignee", "fullName email");

    if (!ticket) throw new Error("Ticket not found");

    NotificationService.notifyUser(
      ticket.user._id.toString(),
      `Ticket Closed: ${ticket.ticketNumber}`,
      `Your ticket has been closed.`,
      NotificationType.INFO,
      { ticketId: ticket._id },
    );

    return ticket;
  }

  // ============ PARTNER METHODS ============

  private static async getPartnerBookingIds(partnerId: string): Promise<Types.ObjectId[]> {
    const bookings = await BookingModel.find({
      partner: new Types.ObjectId(partnerId),
      isDeleted: false,
    })
      .select("_id")
      .lean();
    return bookings.map((b) => b._id as Types.ObjectId);
  }

  private static async validatePartnerOwnership(ticketId: string, partnerId: string) {
    const bookingIds = await this.getPartnerBookingIds(partnerId);
    if (bookingIds.length === 0) return null;

    return TicketModel.findOne({
      _id: new Types.ObjectId(ticketId),
      bookingId: { $in: bookingIds },
    });
  }

  static async getPartnerTickets(partnerId: string, page: number = 1, limit: number = 20) {
    const bookingIds = await this.getPartnerBookingIds(partnerId);
    if (bookingIds.length === 0) {
      return { tickets: [], total: 0, page, totalPages: 0, hasNextPage: false, hasPrevPage: false };
    }

    const skip = (page - 1) * limit;
    const query = { bookingId: { $in: bookingIds } };

    const [tickets, total] = await Promise.all([
      TicketModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName email phoneNumber")
        .populate("bookingId", "bookingNumber spaceSnapshot type")
        .lean(),
      TicketModel.countDocuments(query),
    ]);

    return {
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  static async addPartnerReply(
    ticketId: string,
    partnerId: string,
    message: string,
    attachments?: string[],
  ) {
    const ticket = await this.validatePartnerOwnership(ticketId, partnerId);
    if (!ticket) throw new Error("Ticket not found or access denied");

    ticket.messages.push({ sender: "partner", message, attachments, createdAt: new Date() });

    if (ticket.status === TicketStatus.OPEN) ticket.status = TicketStatus.IN_PROGRESS;

    ticket.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await ticket.save();

    NotificationService.notifyUser(
      ticket.user.toString(),
      `Reply on Query: ${ticket.ticketNumber}`,
      `Partner replied: ${message.substring(0, 50)}...`,
      NotificationType.TICKET_UPDATE,
      { ticketId: ticket._id },
    );

    return TicketModel.findById(ticket._id)
      .populate("user", "fullName email phoneNumber")
      .populate("bookingId", "bookingNumber spaceSnapshot type")
      .lean();
  }

  static async partnerCloseTicket(ticketId: string, partnerId: string) {
    const ticket = await this.validatePartnerOwnership(ticketId, partnerId);
    if (!ticket) throw new Error("Ticket not found or access denied");

    ticket.status = TicketStatus.CLOSED;
    ticket.closedAt = new Date();
    await ticket.save();

    NotificationService.notifyUser(
      ticket.user.toString(),
      `Query Closed: ${ticket.ticketNumber}`,
      `Your query has been closed by the partner.`,
      NotificationType.INFO,
      { ticketId: ticket._id },
    );

    return TicketModel.findById(ticket._id)
      .populate("user", "fullName email phoneNumber")
      .populate("bookingId", "bookingNumber spaceSnapshot type")
      .lean();
  }

  // ============ AFFILIATE METHODS ============

  static async getAffiliateTickets(
    affiliateUserId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit;
    const query = {
      affiliateId: new Types.ObjectId(affiliateUserId),
      chatType: "user_partner" as const,
    };

    const [tickets, total] = await Promise.all([
      TicketModel.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName email phoneNumber")
        .populate("bookingId", "bookingNumber spaceSnapshot type")
        .lean(),
      TicketModel.countDocuments(query),
    ]);

    return { tickets, total, page, totalPages: Math.ceil(total / limit) };
  }

  static async tapInToTicket(ticketId: string, userId: string, role: string): Promise<any> {
    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const isAdmin = ["admin", "super_admin", "support"].includes(role);
    const isAffiliate = ticket.affiliateId?.toString() === userId;

    if (!isAdmin && !isAffiliate) {
      throw new Error("Access denied: you are not the affiliate for this ticket");
    }

    if (!ticket.tappedIn.includes(userId)) {
      ticket.tappedIn.push(userId);
      await ticket.save();
    }

    const tapRole = isAdmin ? "Admin" : "Affiliate";
    ticket.messages.push({
      sender: isAdmin ? "admin" : "affiliate",
      message: `[${tapRole} joined the conversation]`,
      createdAt: new Date(),
    });
    ticket.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await ticket.save();

    return TicketModel.findById(ticket._id)
      .populate("user", "fullName email phoneNumber")
      .populate("bookingId", "bookingNumber spaceSnapshot type")
      .lean();
  }

  static async addAffiliateReply(
    ticketId: string,
    affiliateId: string,
    message: string,
  ): Promise<any> {
    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    if (!ticket.tappedIn.includes(affiliateId)) {
      throw new Error("You must tap in before you can send messages");
    }

    ticket.messages.push({ sender: "affiliate", message, createdAt: new Date() });
    ticket.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await ticket.save();

    NotificationService.notifyUser(
      ticket.user.toString(),
      `New message in your query: ${ticket.ticketNumber}`,
      `Affiliate replied: ${message.substring(0, 50)}...`,
      NotificationType.TICKET_UPDATE,
      { ticketId: ticket._id },
    );

    return TicketModel.findById(ticket._id)
      .populate("user", "fullName email phoneNumber")
      .populate("bookingId", "bookingNumber spaceSnapshot type")
      .lean();
  }
}
