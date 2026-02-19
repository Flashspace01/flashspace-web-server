import { TicketModel, Ticket, TicketStatus, TicketPriority, TicketCategory } from "../models/Ticket";
import { UserModel } from "../../authModule/models/user.model";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { SpacePortalSpaceModel } from "../../spacePortalModule/models/space.model";
import { Types } from "mongoose";
import { NotificationService } from "../../notificationModule/services/notification.service";
import { NotificationType } from "../../notificationModule/models/Notification";

export interface CreateTicketDTO {
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  attachments?: string[];
  bookingId?: string;
  partner?: string;
  spaceId?: string;
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

    let partnerId: string | undefined = data.partner;
    let spaceId: string | undefined = data.spaceId;
    let spaceSnapshot: any = undefined;

    if (data.bookingId) {
      const booking = await BookingModel.findById(data.bookingId).lean();
      if (!booking) {
        throw new Error("Booking not found");
      }
      if (booking.user?.toString() !== userId) {
        throw new Error("Booking does not belong to user");
      }
      partnerId = partnerId || booking.partner?.toString();
      spaceId = spaceId || booking.spaceId?.toString();
      spaceSnapshot = booking.spaceSnapshot;
    } else if (data.spaceId) {
      // Look up space to determine partner and snapshot
      const space = await SpacePortalSpaceModel.findOne({
        _id: Types.ObjectId.isValid(data.spaceId) ? data.spaceId : undefined,
        isDeleted: false,
      }).lean();
      if (space) {
        partnerId = partnerId || (space.partner as any)?.toString?.();
        spaceId = spaceId || space._id?.toString();
        spaceSnapshot = {
          name: space.name,
          address: space.location,
          city: space.city,
        };
      }
    }

    if (!partnerId) {
      throw new Error("Unable to determine space partner for ticket");
    }

    const ticket = await TicketModel.create({
      ticketNumber,
      subject: data.subject,
      description: data.description,
      spaceId,
      spaceSnapshot,
      user: new Types.ObjectId(userId),
      partner: partnerId ? new Types.ObjectId(partnerId) : undefined,
      category: data.category,
      priority: data.priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      attachments: data.attachments || [],
      bookingId: data.bookingId ? new Types.ObjectId(data.bookingId) : undefined,
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

    // Notify Admins
    NotificationService.notifyAdmin(
      `New Ticket: ${ticketNumber}`,
      `A new ticket "${data.subject}" has been created.`,
      NotificationType.INFO,
      { ticketId: ticket._id }
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

    // Notify Admins if user relied
    if (data.sender === 'user') {
      NotificationService.notifyAdmin(
        `New Reply on Ticket: ${ticket.ticketNumber}`,
        `User replied: ${data.message.substring(0, 50)}...`,
        NotificationType.TICKET_UPDATE,
        { ticketId: ticket._id }
      );
    }

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

    // Notify User
    NotificationService.notifyUser(
      ticket.user.toString(),
      `Update on Ticket: ${ticket.ticketNumber}`,
      `Admin replied: ${message.substring(0, 50)}...`,
      NotificationType.TICKET_UPDATE,
      { ticketId: ticket._id }
    );

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

    // Notify User
    NotificationService.notifyUser(
      ticket.user._id.toString(), // user is populated
      `Ticket Resolved: ${ticket.ticketNumber}`,
      `Your ticket has been marked as resolved.`,
      NotificationType.SUCCESS,
      { ticketId: ticket._id }
    );

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

    // Notify User
    NotificationService.notifyUser(
      ticket.user._id.toString(),
      `Ticket Closed: ${ticket.ticketNumber}`,
      `Your ticket has been closed.`,
      NotificationType.INFO,
      { ticketId: ticket._id }
    );

    return ticket;
  }

  // ============ PARTNER METHODS ============

  /**
   * Helper: get all bookingIds for a partner's spaces.
   */
  private static async getPartnerBookingIds(partnerId: string): Promise<Types.ObjectId[]> {
    // 1. Find all spaces owned by this partner
    const spaces = await SpacePortalSpaceModel.find({ partner: new Types.ObjectId(partnerId) }).select('_id').lean();
    const spaceIds = spaces.map(s => s._id);
    if (spaceIds.length === 0) return [];

    // 2. Find all bookings for those spaces
    const bookings = await BookingModel.find({ spaceId: { $in: spaceIds } }).select('_id').lean();
    return bookings.map(b => b._id as Types.ObjectId);
  }

  /**
   * Helper: validate that a ticket belongs to one of partner's spaces.
   */
  private static async validatePartnerOwnership(ticketId: string, partnerId: string) {
    const bookingIds = await this.getPartnerBookingIds(partnerId);
    if (bookingIds.length === 0) return null;

    return TicketModel.findOne({
      _id: new Types.ObjectId(ticketId),
      bookingId: { $in: bookingIds }
    });
  }

  /**
   * Get all tickets that belong to bookings on partner's listings.
   */
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
        .populate('user', 'fullName email phoneNumber')
        .populate('bookingId', 'bookingNumber spaceSnapshot type')
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

  /**
   * Partner replies to a ticket.
   */
  static async addPartnerReply(ticketId: string, partnerId: string, message: string, attachments?: string[]) {
    const ticket = await this.validatePartnerOwnership(ticketId, partnerId);
    if (!ticket) {
      throw new Error('Ticket not found or access denied');
    }

    ticket.messages.push({
      sender: 'partner',
      message,
      attachments,
      createdAt: new Date()
    });

    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }

    ticket.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await ticket.save();

    // Notify user
    NotificationService.notifyUser(
      ticket.user.toString(),
      `Reply on Query: ${ticket.ticketNumber}`,
      `Partner replied: ${message.substring(0, 50)}...`,
      NotificationType.TICKET_UPDATE,
      { ticketId: ticket._id }
    );

    return TicketModel.findById(ticket._id)
      .populate('user', 'fullName email phoneNumber')
      .populate('bookingId', 'bookingNumber spaceSnapshot type')
      .lean();
  }

  /**
   * Partner resolves (directly closes) a ticket.
   */
  static async partnerCloseTicket(ticketId: string, partnerId: string) {
    const ticket = await this.validatePartnerOwnership(ticketId, partnerId);
    if (!ticket) {
      throw new Error('Ticket not found or access denied');
    }

    ticket.status = TicketStatus.CLOSED;
    ticket.closedAt = new Date();
    await ticket.save();

    // Notify user
    NotificationService.notifyUser(
      ticket.user.toString(),
      `Query Closed: ${ticket.ticketNumber}`,
      `Your query has been closed by the partner.`,
      NotificationType.INFO,
      { ticketId: ticket._id }
    );

    return TicketModel.findById(ticket._id)
      .populate('user', 'fullName email phoneNumber')
      .populate('bookingId', 'bookingNumber spaceSnapshot type')
      .lean();
  }
}
