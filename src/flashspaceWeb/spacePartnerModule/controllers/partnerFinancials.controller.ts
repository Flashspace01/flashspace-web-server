import { Request, Response } from "express";
import {
  PartnerInvoice,
  PartnerPayment,
} from "../models/partnerFinancials.model";

// --- Invoices ---

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.id;
    const { client, description, amount, dueDate, space, invoiceId } = req.body;

    if (!partnerId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    if (!client || !description || !amount || !dueDate || !space) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: client, description, amount, dueDate, space",
      });
    }

    // Generate Invoice ID if not provided
    const finalInvoiceId =
      invoiceId ||
      `INV-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;

    // Check for duplicate Invoice ID
    const existingInvoice = await PartnerInvoice.findOne({
      invoiceId: finalInvoiceId,
      partnerId,
    });
    if (existingInvoice) {
      return res
        .status(400)
        .json({ success: false, message: "Invoice ID already exists" });
    }

    const invoice = new PartnerInvoice({
      partnerId,
      invoiceId: finalInvoiceId,
      client,
      description,
      amount: Number(amount),
      dueDate: new Date(dueDate),
      space,
      status: "Pending",
    });

    await invoice.save();

    res.status(201).json({ success: true, data: invoice });
  } catch (error: any) {
    console.error("[ERROR] createInvoice:", error);
    res.status(500).json({
      success: false,
      message: "Error creating invoice",
      error: error.message || error,
    });
  }
};

import { InvoiceModel } from "../../invoiceModule/invoice.model";
import { BookingModel } from "../../bookingModule/booking.model";
import { PaymentModel } from "../../paymentModule/payment.model";

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.id;

    if (!partnerId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    // 1. Fetch manual invoices
    const manualInvoices = await PartnerInvoice.find({ partnerId }).lean();

    // 2. Fetch platform invoices
    const platformInvoices = await InvoiceModel.find({
      partner: partnerId,
      isDeleted: false,
    })
      .populate("user", "fullName")
      .populate("booking")
      .lean();

    // 3. Format manual invoices
    const formattedManual = manualInvoices.map((inv: any) => ({
      _id: inv._id,
      invoiceId: inv.invoiceId,
      client: inv.client,
      description: inv.description,
      amount: inv.amount,
      dueDate: inv.dueDate,
      status: inv.status,
      space: inv.space,
      createdAt: inv.createdAt,
    }));

    // 4. Format platform invoices
    const formattedPlatform = platformInvoices.map((inv: any) => {
      const user = inv.user as any;
      const booking = inv.booking as any;

      // Map status. InvoiceModel uses lowercase (paid, pending, overdue, cancelled)
      let mappedStatus = "Pending";
      if (inv.status === "paid") mappedStatus = "Paid";
      else if (inv.status === "overdue") mappedStatus = "Overdue";
      else if (inv.status === "cancelled") mappedStatus = "Cancelled";

      return {
        _id: inv._id,
        invoiceId: inv.invoiceNumber,
        client: user?.fullName || "Unknown Client",
        description:
          inv.description ||
          (booking ? `Booking ${booking.bookingNumber}` : "Platform Invoice"),
        amount: inv.total,
        dueDate: inv.dueDate || inv.createdAt,
        status: mappedStatus,
        space: booking?.spaceSnapshot?.name || "Platform Booking",
        createdAt: inv.createdAt,
      };
    });

    // 5. Combine and sort
    const combinedInvoices = [...formattedManual, ...formattedPlatform].sort(
      (a, b) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      },
    );

    res.json({ success: true, data: combinedInvoices });
  } catch (error: any) {
    console.error("[ERROR] getInvoices:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching invoices",
      error: error.message || error,
    });
  }
};

// --- Payments ---

export const createPayment = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.id;
    const {
      client,
      amount,
      method,
      purpose,
      space,
      paymentId,
      invoiceId,
      commission,
    } = req.body;

    if (!partnerId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    if (!client || !amount || !method || !purpose || !space) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: client, amount, method, purpose, space",
      });
    }

    // Generate Payment ID if not provided
    const finalPaymentId =
      paymentId ||
      `PAY-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;

    // Check for duplicate Payment ID
    const existingPayment = await PartnerPayment.findOne({
      paymentId: finalPaymentId,
      partnerId,
    });
    if (existingPayment) {
      return res
        .status(400)
        .json({ success: false, message: "Payment ID already exists" });
    }

    const payment = new PartnerPayment({
      partnerId,
      paymentId: finalPaymentId,
      client,
      amount: Number(amount),
      method,
      purpose,
      space,
      invoiceId: invoiceId || "",
      commission: commission ? Number(commission) : 0,
      date: new Date(),
      status: "Completed",
    });

    await payment.save();

    res.status(201).json({ success: true, data: payment });
  } catch (error: any) {
    console.error("[ERROR] createPayment:", error);
    res.status(500).json({
      success: false,
      message: "Error creating payment",
      error: error.message || error,
    });
  }
};

export const getPayments = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.id;

    if (!partnerId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    // 1. Fetch manual payments
    const manualPayments = await PartnerPayment.find({ partnerId }).lean();

    // 2. Fetch platform payments via bookings
    const platformBookings = await BookingModel.find({
      partner: partnerId,
      isDeleted: false,
    })
      .populate("payment")
      .populate("user", "fullName")
      .lean();

    // 3. Format manual payments
    const formattedManual = manualPayments.map((pay: any) => ({
      _id: pay._id,
      paymentId: pay.paymentId,
      client: pay.client,
      amount: pay.amount,
      method: pay.method,
      purpose: pay.purpose,
      space: pay.space,
      invoiceId: pay.invoiceId,
      commission: pay.commission,
      date: pay.date,
      status: pay.status,
      createdAt: pay.createdAt,
    }));

    // 4. Format platform payments
    const formattedPlatform = platformBookings
      .filter((booking: any) => booking.payment) // Only bookings with payments
      .map((booking: any) => {
        const user = booking.user as any;
        const payment = booking.payment as any;

        // Map status. PaymentModel uses lowercase (completed, failed, processing, etc)
        let mappedStatus = "Pending";
        if (payment.status === "completed") mappedStatus = "Completed";
        else if (payment.status === "failed" || payment.status === "cancelled")
          mappedStatus = "Failed";

        return {
          _id: payment._id,
          paymentId:
            payment.razorpayPaymentId ||
            payment.razorpayOrderId ||
            `PAY-SYS-${payment._id.toString().slice(-6)}`,
          client: user?.fullName || payment.userName || "Unknown Client",
          // Payment model stores amount in paise
          amount: payment.amount ? payment.amount / 100 : 0,
          method: "Razorpay",
          purpose: "Platform Booking",
          space:
            payment.spaceName ||
            booking.spaceSnapshot?.name ||
            "Platform Space",
          invoiceId: "", // Platform payments might not have a direct manual invoice ID
          commission: 0, // Commission logic would normally go here if applicable
          date: payment.createdAt,
          status: mappedStatus,
          createdAt: payment.createdAt,
        };
      });

    // 5. Combine and sort
    const combinedPayments = [...formattedManual, ...formattedPlatform].sort(
      (a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      },
    );

    res.json({ success: true, data: combinedPayments });
  } catch (error: any) {
    console.error("[ERROR] getPayments:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching payments",
        error: error.message || error,
      });
  }
};
