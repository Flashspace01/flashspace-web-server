import mongoose from "mongoose";
import { InvoiceModel } from "./invoice.model";
import { BookingModel } from "../bookingModule/booking.model";
import { UserRole } from "../authModule/models/user.model";

export class InvoiceService {
  /**
   * Generates an invoice for a specific booking if it doesn't already exist.
   * Standardizes GST logic based on state.
   */
  static async generateInvoice(bookingId: string) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new Error("Booking not found");

    // Check if invoice already exists
    let invoice = await InvoiceModel.findOne({
      booking: booking._id,
    });
    if (invoice) return invoice;

    // FIXED: Fetch the true retail finalPrice from the updated Booking schema
    const subtotal = booking.plan.finalPrice;

    // Fallback safeguard in case old DB records lack finalPrice
    if (subtotal === undefined || subtotal === null) {
      throw new Error("Invalid booking plan pricing data");
    }

    const taxRate = 18;
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const total = subtotal + taxAmount;

    // Generate Invoice Number
    const count = await InvoiceModel.countDocuments();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    // Create the invoice
    invoice = await InvoiceModel.create({
      invoiceNumber,
      user: booking.user,
      partner: booking.partner,
      booking: booking._id,
      bookingNumber: booking.bookingNumber,
      description: `${booking.spaceSnapshot?.name || "Booking"} - ${booking.plan.name}`,
      lineItems: [
        {
          description: booking.plan.name,
          quantity: 1,
          rate: subtotal,
          amount: subtotal,
        },
      ],
      subtotal,
      taxRate,
      taxAmount,
      total,
      status: "pending",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
      billingAddress: {
        name: booking.spaceSnapshot?.name || "Guest",
        city: booking.spaceSnapshot?.city || "",
      },
    });

    return invoice;
  }

  /**
   * Marks an invoice as paid and records the timestamp.
   */
  static async markAsPaid(invoiceId: string) {
    const invoice = await InvoiceModel.findByIdAndUpdate(
      invoiceId,
      {
        status: "paid",
        paidAt: new Date(),
      },
      { new: true },
    );
    if (!invoice) throw new Error("Invoice not found");
    return invoice;
  }

  /**
   * Fetches invoices with pagination and summary totals based on user role.
   */
  static async getInvoices(
    userId: string,
    role: string,
    filters: any = {},
    page: number = 1,
    limit: number = 10,
  ) {
    const query: any = { isDeleted: false };

    // RBAC Logic (Strictly casting to ObjectId for the $match pipeline)
    if (role !== UserRole.ADMIN) {
      if (role === UserRole.PARTNER) {
        query.partner = new mongoose.Types.ObjectId(userId);
      } else {
        query.user = new mongoose.Types.ObjectId(userId);
      }
    }

    // Additional filters
    if (filters.status) query.status = filters.status;

    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.createdAt.$lte = new Date(filters.toDate);
    }

    const skip = (page - 1) * limit;

    const [invoices, total, summary] = await Promise.all([
      InvoiceModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InvoiceModel.countDocuments(query),
      InvoiceModel.aggregate([
        { $match: query },
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

    return {
      invoices,
      summary: {
        totalPaid: summary[0]?.totalPaid || 0,
        totalPending: summary[0]?.totalPending || 0,
        count: total,
      },
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a specific invoice with access control.
   */
  static async getInvoiceById(userId: string, role: string, invoiceId: string) {
    const query: any = { _id: invoiceId, isDeleted: false };

    // RBAC Logic
    if (role !== UserRole.ADMIN) {
      if (role === UserRole.PARTNER) {
        query.partner = new mongoose.Types.ObjectId(userId);
      } else {
        query.user = new mongoose.Types.ObjectId(userId);
      }
    }

    const invoice = await InvoiceModel.findOne(query);
    if (!invoice) throw new Error("Invoice not found or unauthorized");
    return invoice;
  }
}
