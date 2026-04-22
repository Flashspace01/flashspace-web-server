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
import { MeetingModel } from "../../meetingSchedulerModule/meeting.model";
import { PropertyModel } from "../../propertyModule/property.model";
import { VirtualOfficeModel } from "../../virtualOfficeModule/virtualOffice.model";
import { CoworkingSpaceModel } from "../../coworkingSpaceModule/coworkingSpace.model";
import { MeetingRoomModel } from "../../meetingRoomModule/meetingRoom.model";
import Visit from "../../visitModule/models/visit.model";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// Explicit type → model mapping for reliable partner resolution
const SPACE_MODEL_MAP: Record<string, any> = {
  VirtualOffice: VirtualOfficeModel,
  CoworkingSpace: CoworkingSpaceModel,
  MeetingRoom: MeetingRoomModel,
};

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
    console.log(`[TicketDebug] createTicket called for user ${userId} with data:`, JSON.stringify(data));
    const ticketNumber = Ticket.generateTicketNumber();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    let bookingObjectId: Types.ObjectId | undefined;
    let partnerId: Types.ObjectId | undefined = undefined;
    let affiliateId: Types.ObjectId | undefined = undefined;
    let chatType: "user_admin" | "user_partner" = "user_admin";

    if (data.bookingId) {
      let bookingDoc: any;
      if (Types.ObjectId.isValid(data.bookingId)) {
        bookingObjectId = new Types.ObjectId(data.bookingId);
        bookingDoc = await BookingModel.findById(bookingObjectId).lean();
        console.log(`[TicketDebug] Lookup by ID ${bookingObjectId}: ${bookingDoc ? "Found" : "Not Found"}`);
      } else {
        bookingDoc = await BookingModel.findOne({ bookingNumber: data.bookingId }).lean();
        console.log(`[TicketDebug] Lookup by Number ${data.bookingId}: ${bookingDoc ? "Found" : "Not Found"}`);
        if (bookingDoc) bookingObjectId = bookingDoc._id as Types.ObjectId;
      }

      if (bookingDoc) {
        console.log(`[TicketDebug] Booking found. Type: ${bookingDoc.type}, SpaceId: ${bookingDoc.spaceId}`);
        chatType = "user_partner";

        // ── Step 1: Resolve partner from the actual space model ──
        const debugLogs: string[] = [];
        debugLogs.push(`[${new Date().toISOString()}] Creating ticket for booking: ${bookingObjectId}`);

        try {
          const SpaceModel = SPACE_MODEL_MAP[bookingDoc.type];
          debugLogs.push(`Space Type: ${bookingDoc.type}, Model exists: ${!!SpaceModel}`);

          if (SpaceModel) {
            const space = await SpaceModel.findById(bookingDoc.spaceId).lean();
            debugLogs.push(`Space record found: ${!!space}`);
            
            if (space && (space as any).partner) {
              const sid = (space as any).partner.toString();
              debugLogs.push(`Found partner ID in space: ${sid}`);
              
              // Verify immediately
              const userExists = await UserModel.findById(sid).select('_id fullName').lean();
              if (userExists) {
                partnerId = new Types.ObjectId(sid);
                debugLogs.push(`✅ Partner verified: ${userExists.fullName}`);
              } else {
                debugLogs.push(`❌ Partner ID ${sid} NOT found in Users collection!`);
              }
            }

            // ── Step 2: Fallback to Property (via space.property) ──
            if (!partnerId && space && (space as any).property) {
              debugLogs.push(`Falling back to checking Property: ${(space as any).property}`);
              const property = await PropertyModel.findById((space as any).property).lean();
              if (property && property.partner) {
                const pid = property.partner.toString();
                const userExists = await UserModel.findById(pid).select('_id fullName').lean();
                if (userExists) {
                  partnerId = new Types.ObjectId(pid);
                  debugLogs.push(`✅ Partner found via Property: ${userExists.fullName}`);
                } else {
                  debugLogs.push(`❌ Property partner ${pid} NOT found in Users!`);
                }
              }
            }
          }

          // ── Step 3: Direct Property Lookup ──
          if (!partnerId) {
            debugLogs.push(`Trying direct Property lookup for spaceId: ${bookingDoc.spaceId}`);
            const property = await PropertyModel.findById(bookingDoc.spaceId).lean();
            if (property && property.partner) {
              const pid = property.partner.toString();
              const userExists = await UserModel.findById(pid).select('_id fullName').lean();
              if (userExists) {
                partnerId = new Types.ObjectId(pid);
                debugLogs.push(`✅ Partner found via direct Property lookup: ${userExists.fullName}`);
              }
            }
          }

          // ── Step 4: Final fallback ──
          if (!partnerId && bookingDoc.partner) {
            const bid = bookingDoc.partner.toString();
            debugLogs.push(`Last fallback - checking booking.partner: ${bid}`);
            const userExists = await UserModel.findById(bid).select('_id fullName').lean();
            if (userExists) {
              partnerId = new Types.ObjectId(bid);
              debugLogs.push(`✅ Partner found via booking fallback: ${userExists.fullName}`);
            } else {
              debugLogs.push(`❌ Booking partner ${bid} NOT found in Users!`);
            }
          }

        } catch (err: any) {
          debugLogs.push(`ERROR in resolution: ${err.message}`);
        }

        debugLogs.push(`FINAL Resolved partnerId: ${partnerId || 'NONE'}`);

        // Safety override for the known bad ID
        if (partnerId && partnerId.toString() === '69e0ba90ffbd9962e51008e2') {
            debugLogs.push(`🚨 FORCING NULL: Suspicious ID detected at last moment.`);
            partnerId = undefined;
        }

        // Write logs to file for Antigravity to see
        try {
          const logPath = path.resolve(process.cwd(), 'ticket_debug.log');
          fs.appendFileSync(logPath, debugLogs.join('\n') + '\n\n');
        } catch (f) { /* ignore */ }

        if (bookingDoc.affiliateId) {
          affiliateId = new Types.ObjectId(bookingDoc.affiliateId.toString());
        }
      } else {
        console.warn(`[TicketDebug] Could not find booking for ID: ${data.bookingId}`);
      }
    }

    const ticket = await TicketModel.create({
      ticketNumber,
      subject: data.subject,
      description: data.description,
      user: new Types.ObjectId(userId),
      category: data.category,
      priority: data.priority || TicketPriority.MEDIUM,
      status: partnerId ? TicketStatus.IN_PROGRESS : TicketStatus.OPEN,
      attachments: data.attachments || [],
      bookingId: bookingObjectId,
      partnerId,
      assignee: partnerId || null, // Auto-assign to partner if exists
      chatType,
      affiliateId,
      tappedIn: [],
      messages: [{ sender: "user", message: data.description, createdAt: new Date() }],
      expiresAt,
    });

    const populatedTicket = await TicketModel.findById(ticket._id)
      .populate("user", "fullName email phoneNumber")
      .populate("assignee", "fullName email role")
      .lean();

    NotificationService.notifyAdmin(
      `New Ticket: ${ticketNumber}`,
      `A new ticket "${data.subject}" has been created.`,
      NotificationType.INFO,
      { ticketId: ticket._id },
    );

    if (partnerId) {
      NotificationService.notifyUser(
        partnerId.toString(),
        `New Assignment: ${ticketNumber}`,
        `You have been assigned to help with ticket regarding your space booking.`,
        NotificationType.INFO,
        { ticketId: ticket._id },
      );
    }

    return populatedTicket;
  }

  static async getUserTickets(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      TicketModel.find({ user: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("assignee", "fullName email role")
        .populate("bookingId", "bookingNumber spaceSnapshot type status")
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
        .populate("assignee", "fullName email role")
        .populate("bookingId", "bookingNumber spaceSnapshot type status")
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
        .populate("assignee", "fullName email role")
        .populate("bookingId", "bookingNumber spaceSnapshot type status")
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
      .populate("assignee", "fullName email role");

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
      .populate("assignee", "fullName email role")
      .lean();
  }

  static async assignTicket(ticketId: string, assigneeId: string) {
    const ticket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { assignee: new Types.ObjectId(assigneeId), status: TicketStatus.IN_PROGRESS },
      { new: true },
    )
      .populate("user", "fullName email phoneNumber")
      .populate("assignee", "fullName email role");

    if (!ticket) throw new Error("Ticket not found");

    const targetUserId = (ticket.user as any)._id ? (ticket.user as any)._id.toString() : ticket.user.toString();

    // Notify the user about the assignment
    try {
      NotificationService.notifyUser(
        targetUserId,
        `Ticket Assigned: ${ticket.ticketNumber}`,
        `Your ticket has been assigned to ${(ticket.assignee as any).fullName || 'a specialist'}. They will assist you shortly.`,
        NotificationType.TICKET_UPDATE,
        { ticketId: ticket._id },
      );

      // Notify the assignee about their new task
      NotificationService.notifyUser(
        assigneeId,
        `New Ticket Assignment: ${ticket.ticketNumber}`,
        `You have been assigned to handle ticket: ${ticket.subject}`,
        NotificationType.TICKET_UPDATE,
        { ticketId: ticket._id },
      );
    } catch (err) {
      console.error("Failed to send assignment notifications:", err);
    }

    return ticket;
  }

  static async escalateTicket(ticketId: string) {
    const ticket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { status: TicketStatus.ESCALATED },
      { new: true },
    )
      .populate("user", "fullName email phoneNumber")
      .populate("assignee", "fullName email role");

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
      .populate("assignee", "fullName email role");

    if (!ticket) throw new Error("Ticket not found");

    const targetUserId = (ticket.user as any)._id ? (ticket.user as any)._id.toString() : ticket.user.toString();

    NotificationService.notifyUser(
      targetUserId,
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
      .populate("assignee", "fullName email role");

    if (!ticket) throw new Error("Ticket not found");

    const targetUserId = (ticket.user as any)._id ? (ticket.user as any)._id.toString() : ticket.user.toString();

    NotificationService.notifyUser(
      targetUserId,
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

    const query: any = {
      _id: new Types.ObjectId(ticketId),
      $or: [
        { partnerId: new Types.ObjectId(partnerId) },
        { assignee: new Types.ObjectId(partnerId) }
      ]
    };

    if (bookingIds.length > 0) {
      query.$or.push({ bookingId: { $in: bookingIds } });
    }

    return TicketModel.findOne(query);
  }

  static async getPartnerTickets(partnerId: string, page: number = 1, limit: number = 20) {
    const bookingIds = await this.getPartnerBookingIds(partnerId);

    const skip = (page - 1) * limit;
    const orConditions: any[] = [
      { partnerId: new Types.ObjectId(partnerId) },
      { assignee: new Types.ObjectId(partnerId) }
    ];

    if (bookingIds.length > 0) {
      orConditions.push({ bookingId: { $in: bookingIds } });
    }

    const query = { $or: orConditions };

    const [tickets, total] = await Promise.all([
      TicketModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName email phoneNumber")
        .populate("assignee", "fullName email role")
        .populate("bookingId", "bookingNumber spaceSnapshot type")
        .lean(),
      TicketModel.countDocuments(query),
    ]);

    console.log(`[TicketDebug] Found ${tickets.length} tickets for partner ${partnerId}. Global count: ${total}`);
    if (tickets.length > 0) {
        console.log(`[TicketDebug] Example ticket for partner:`, tickets[0]._id, { 
            partnerId: tickets[0].partnerId, 
            assignee: tickets[0].assignee?._id || tickets[0].assignee,
            bookingId: tickets[0].bookingId?._id || tickets[0].bookingId
        });
    }

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

  static async partnerMessageClient(
    partnerId: string,
    data: { clientUserId: string; bookingId?: string; subject: string; message: string }
  ) {
    const partnerObjectId = new Types.ObjectId(partnerId);

    // 1. Try to find if this bookingId is an ObjectId or a bookingNumber
    let bookingObjectId: Types.ObjectId | undefined;
    if (data.bookingId) {
      if (Types.ObjectId.isValid(data.bookingId)) {
        bookingObjectId = new Types.ObjectId(data.bookingId);
      } else {
        const booking = await BookingModel.findOne({ bookingNumber: data.bookingId }).select("_id").lean();
        if (booking) {
          bookingObjectId = booking._id as Types.ObjectId;
        }
      }
    }

    // 2. Identify the client
    if (!data.clientUserId || !Types.ObjectId.isValid(data.clientUserId)) {
      console.error("[TicketService.partnerMessageClient] Invalid clientUserId:", data.clientUserId);
      throw new Error(`Invalid or missing client identification: ${data.clientUserId}`);
    }

    let clientObjectId = new Types.ObjectId(data.clientUserId);
    
    // Check if this ID actually belongs to a meeting or visit, and if that lead has a user account
    try {
      const [meeting, visit] = await Promise.all([
        MeetingModel.findById(data.clientUserId).select("bookingUserEmail").lean(),
        Visit.findById(data.clientUserId).select("email").lean()
      ]);
      const email = (meeting as any)?.bookingUserEmail || (visit as any)?.email;
      if (email) {
        const user = await UserModel.findOne({ email }).select("_id").lean();
        if (user) {
          console.log(`[TicketService.partnerMessageClient] Linked lead ${data.clientUserId} to user ${user._id}`);
          clientObjectId = user._id as Types.ObjectId;
        }
      }
    } catch (err) {
      console.warn("[TicketService.partnerMessageClient] Error during lead lookup:", err);
      // Continue anyway with the original clientUserId
    }

    // 3. Check for existing direct chat between this partner and user for this context
    const query: any = {
      chatType: "user_partner",
      partnerId: partnerObjectId,
      $or: [
        { user: clientObjectId }
      ]
    };

    if (bookingObjectId) {
      query.$or.push({ bookingId: bookingObjectId });
    }
    
    // Also check if the clientUserId itself was used as bookingId (for guest leads)
    if (data.clientUserId && Types.ObjectId.isValid(data.clientUserId)) {
      query.$or.push({ bookingId: new Types.ObjectId(data.clientUserId) });
    }

    let ticket = await TicketModel.findOne(query);

    if (ticket) {
      console.log(`[TicketService.partnerMessageClient] Found existing ticket: ${ticket.ticketNumber}`);
      ticket.messages.push({
        sender: "partner",
        message: data.message,
        createdAt: new Date()
      });
      ticket.status = TicketStatus.IN_PROGRESS;
      await ticket.save();
    } else {
      console.log(`[TicketService.partnerMessageClient] Creating new ticket for ${clientObjectId}`);
      const ticketNumber = Ticket.generateTicketNumber();
      ticket = await TicketModel.create({
        ticketNumber,
        subject: data.subject,
        description: data.message,
        user: clientObjectId,
        partnerId: partnerObjectId,
        bookingId: bookingObjectId || (Types.ObjectId.isValid(data.clientUserId) ? new Types.ObjectId(data.clientUserId) : undefined),
        category: TicketCategory.LEADS,
        priority: TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        chatType: "user_partner",
        messages: [{ sender: "partner", message: data.message, createdAt: new Date() }],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    return await TicketModel.findById(ticket._id)
      .populate("user", "fullName email phoneNumber")
      .populate("bookingId", "bookingNumber spaceSnapshot type")
      .lean();
  }

  static async submitFeedback(ticketId: string, userId: string, rating: number, remarks: string) {
    const ticket = await TicketModel.findOne({
      _id: new Types.ObjectId(ticketId),
      user: new Types.ObjectId(userId)
    });

    if (!ticket) throw new Error("Ticket not found or access denied");
    
    if (ticket.status !== TicketStatus.CLOSED && ticket.status !== TicketStatus.RESOLVED) {
      throw new Error("Feedback can only be submitted for closed or resolved tickets");
    }

    if (ticket.feedbackSubmittedAt) {
      throw new Error("Feedback already submitted for this ticket");
    }

    ticket.rating = rating;
    ticket.ratingRemarks = remarks;
    ticket.ratedAssignee = ticket.assignee || ticket.partnerId; // Capture the person who was assigned/partner
    ticket.feedbackSubmittedAt = new Date();

    await ticket.save();

    NotificationService.notifyAdmin(
      `Feedback Received: ${ticket.ticketNumber}`,
      `User rated ${rating}/5: ${remarks.substring(0, 50)}...`,
      NotificationType.INFO,
      { ticketId: ticket._id }
    );

    return ticket;
  }
}
