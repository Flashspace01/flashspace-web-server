import { Request, Response } from "express";
import { BookingModel } from "../models/booking.model";
import { KYCDocumentModel } from "../models/kyc.model";
import { InvoiceModel } from "../models/invoice.model";
import { SupportTicketModel } from "../models/supportTicket.model";

// ============ DASHBOARD ============

export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get active bookings count
    const activeBookings = await BookingModel.countDocuments({
      user: userId,
      status: "active",
      isDeleted: false,
    });

    // Get pending invoices total
    const pendingInvoices = await InvoiceModel.aggregate([
      { $match: { user: userId, status: "pending", isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    // Get next booking (upcoming expiry)
    const nextBooking = await BookingModel.findOne({
      user: userId,
      status: "active",
      isDeleted: false,
    })
      .sort({ endDate: 1 })
      .select("endDate");

    // Get KYC status
    const kyc = await KYCDocumentModel.findOne({ user: userId });

    // Get recent activity (last 5 bookings/invoices)
    const recentBookings = await BookingModel.find({
      user: userId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("bookingNumber status createdAt spaceSnapshot.name");

    const recentActivity = recentBookings.map((b) => ({
      type: "booking",
      message: `${b.spaceSnapshot?.name || "Booking"} - ${b.status}`,
      date: b.createdAt,
    }));

    // Usage breakdown
    const usageBreakdown = await BookingModel.aggregate([
      { $match: { user: userId, isDeleted: false } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const totalBookings = usageBreakdown.reduce((sum, u) => sum + u.count, 0);
    const virtualOfficeCount = usageBreakdown.find((u) => u._id === "virtual_office")?.count || 0;
    const coworkingCount = usageBreakdown.find((u) => u._id === "coworking_space")?.count || 0;

    // Monthly bookings (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyBookings = await BookingModel.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: sixMonthsAgo },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedMonthly = monthlyBookings.map((m) => ({
      month: months[m._id - 1],
      count: m.count,
    }));

    res.status(200).json({
      success: true,
      data: {
        activeServices: activeBookings,
        pendingInvoices: pendingInvoices[0]?.total || 0,
        nextBookingDate: nextBooking?.endDate || null,
        kycStatus: kyc?.overallStatus || "not_started",
        recentActivity,
        usageBreakdown: {
          virtualOffice: totalBookings > 0 ? Math.round((virtualOfficeCount / totalBookings) * 100) : 0,
          coworkingSpace: totalBookings > 0 ? Math.round((coworkingCount / totalBookings) * 100) : 0,
        },
        monthlyBookings: formattedMonthly,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
  }
};

// ============ BOOKINGS ============

export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type, status, page = 1, limit = 10 } = req.query;

    const filter: any = { user: userId, isDeleted: false };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [bookings, total] = await Promise.all([
      BookingModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      BookingModel.countDocuments(filter),
    ]);

    // Calculate days remaining for each booking
    const bookingsWithDays = bookings.map((b) => {
      const booking = b.toObject();
      if (booking.endDate) {
        const now = new Date();
        const end = new Date(booking.endDate);
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        (booking as any).daysRemaining = diffDays > 0 ? diffDays : 0;
      }
      return booking;
    });

    res.status(200).json({
      success: true,
      data: bookingsWithDays,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bookingId } = req.params;

    const booking = await BookingModel.findOne({
      _id: bookingId,
      user: userId,
      isDeleted: false,
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Calculate days remaining
    const bookingObj = booking.toObject() as any;
    if (bookingObj.endDate) {
      const now = new Date();
      const end = new Date(bookingObj.endDate);
      const diffTime = end.getTime() - now.getTime();
      bookingObj.daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    res.status(200).json({ success: true, data: bookingObj });
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch booking" });
  }
};

export const toggleAutoRenew = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { bookingId } = req.params;
    const { autoRenew } = req.body;

    const booking = await BookingModel.findOneAndUpdate(
      { _id: bookingId, user: userId, isDeleted: false },
      { autoRenew, updatedAt: new Date() },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.status(200).json({
      success: true,
      message: `Auto-renewal ${autoRenew ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    console.error("Toggle auto-renew error:", error);
    res.status(500).json({ success: false, message: "Failed to update auto-renewal" });
  }
};

// ============ KYC ============

export const getKYCStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    let kyc = await KYCDocumentModel.findOne({ user: userId });

    if (!kyc) {
      // Create empty KYC record
      kyc = await KYCDocumentModel.create({
        user: userId,
        overallStatus: "not_started",
        progress: 0,
      });
    }

    res.status(200).json({ success: true, data: kyc });
  } catch (error) {
    console.error("Get KYC error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch KYC status" });
  }
};

export const updateBusinessInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { companyName, companyType, gstNumber, panNumber, cinNumber, registeredAddress } = req.body;

    let kyc = await KYCDocumentModel.findOne({ user: userId });

    if (!kyc) {
      kyc = new KYCDocumentModel({ user: userId });
    }

    kyc.businessInfo = {
      companyName,
      companyType,
      gstNumber,
      panNumber,
      cinNumber,
      registeredAddress,
      verified: false,
    };

    // Update progress
    kyc.progress = calculateKYCProgress(kyc);
    kyc.updatedAt = new Date();

    if (kyc.overallStatus === "not_started") {
      kyc.overallStatus = "pending";
    }

    await kyc.save();

    res.status(200).json({ success: true, message: "Business information updated", data: kyc });
  } catch (error) {
    console.error("Update business info error:", error);
    res.status(500).json({ success: false, message: "Failed to update business info" });
  }
};

export const uploadKYCDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { documentType, fileUrl, name } = req.body;

    if (!documentType || !fileUrl) {
      return res.status(400).json({ success: false, message: "Document type and file URL required" });
    }

    let kyc = await KYCDocumentModel.findOne({ user: userId });

    if (!kyc) {
      kyc = new KYCDocumentModel({ user: userId, documents: [] });
    }

    // Check if document type already exists
    const existingIndex = kyc.documents?.findIndex((d) => d.type === documentType) ?? -1;

    const docEntry = {
      type: documentType,
      name: name || documentType.replace(/_/g, " ").toUpperCase(),
      fileUrl,
      status: "pending" as const,
      uploadedAt: new Date(),
    };

    if (existingIndex >= 0) {
      kyc.documents![existingIndex] = docEntry;
    } else {
      kyc.documents = kyc.documents || [];
      kyc.documents.push(docEntry);
    }

    // Update progress
    kyc.progress = calculateKYCProgress(kyc);
    kyc.overallStatus = "pending";
    kyc.updatedAt = new Date();

    await kyc.save();

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: docEntry,
    });
  } catch (error) {
    console.error("Upload KYC doc error:", error);
    res.status(500).json({ success: false, message: "Failed to upload document" });
  }
};

function calculateKYCProgress(kyc: any): number {
  let progress = 0;
  const totalSteps = 4; // personal, business, documents, review

  if (kyc.personalInfo?.fullName && kyc.personalInfo?.email) progress += 25;
  if (kyc.businessInfo?.companyName && kyc.businessInfo?.panNumber) progress += 25;

  const requiredDocs = ["pan_card", "aadhaar_card"];
  const uploadedDocs = kyc.documents?.map((d: any) => d.type) || [];
  const hasAllDocs = requiredDocs.every((d) => uploadedDocs.includes(d));
  if (hasAllDocs) progress += 25;

  const allApproved = kyc.documents?.every((d: any) => d.status === "approved");
  if (allApproved && kyc.documents?.length >= 2) progress += 25;

  return Math.min(progress, 100);
}

// ============ INVOICES ============

export const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, fromDate, toDate, page = 1, limit = 10 } = req.query;

    const filter: any = { user: userId, isDeleted: false };
    if (status) filter.status = status;
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate as string);
      if (toDate) filter.createdAt.$lte = new Date(toDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [invoices, total, summary] = await Promise.all([
      InvoiceModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      InvoiceModel.countDocuments(filter),
      InvoiceModel.aggregate([
        { $match: { user: userId, isDeleted: false } },
        {
          $group: {
            _id: null,
            totalPaid: {
              $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] },
            },
            totalPending: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$total", 0] },
            },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalPaid: summary[0]?.totalPaid || 0,
          totalPending: summary[0]?.totalPending || 0,
          totalInvoices: total,
        },
        invoices,
      },
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch invoices" });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { invoiceId } = req.params;

    const invoice = await InvoiceModel.findOne({
      _id: invoiceId,
      user: userId,
      isDeleted: false,
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    console.error("Get invoice error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch invoice" });
  }
};

// ============ SUPPORT TICKETS ============

export const getAllTickets = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, page = 1, limit = 10 } = req.query;

    const filter: any = { user: userId, isDeleted: false };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [tickets, total] = await Promise.all([
      SupportTicketModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select("-messages"),
      SupportTicketModel.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: tickets,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get tickets error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch tickets" });
  }
};

export const createTicket = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { subject, category, priority, description, bookingId } = req.body;

    if (!subject || !category || !description) {
      return res.status(400).json({
        success: false,
        message: "Subject, category, and description are required",
      });
    }

    // Generate ticket number
    const count = await SupportTicketModel.countDocuments();
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const ticket = await SupportTicketModel.create({
      ticketNumber,
      user: userId,
      bookingId,
      subject,
      category,
      priority: priority || "medium",
      status: "open",
      messages: [
        {
          sender: "user",
          senderName: req.user?.email || "User",
          senderId: userId,
          message: description,
          createdAt: new Date(),
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Support ticket created",
      data: {
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
      },
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({ success: false, message: "Failed to create ticket" });
  }
};

export const getTicketById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { ticketId } = req.params;

    const ticket = await SupportTicketModel.findOne({
      _id: ticketId,
      user: userId,
      isDeleted: false,
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch ticket" });
  }
};

export const replyToTicket = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const ticket = await SupportTicketModel.findOne({
      _id: ticketId,
      user: userId,
      isDeleted: false,
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    ticket.messages = ticket.messages || [];
    ticket.messages.push({
      sender: "user",
      senderName: req.user?.email || "User",
      senderId: userId as any,
      message,
      createdAt: new Date(),
    });

    if (ticket.status === "waiting_customer") {
      ticket.status = "in_progress";
    }

    ticket.updatedAt = new Date();
    await ticket.save();

    res.status(200).json({ success: true, message: "Reply sent" });
  } catch (error) {
    console.error("Reply to ticket error:", error);
    res.status(500).json({ success: false, message: "Failed to send reply" });
  }
};
