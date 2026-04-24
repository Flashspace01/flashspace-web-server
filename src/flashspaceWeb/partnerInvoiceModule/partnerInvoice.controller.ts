import { Request, Response } from "express";
import { PartnerInvoiceModel } from "./partnerInvoice.model";
import { UserModel, UserRole } from "../authModule/models/user.model";
import path from "path";
import { getIO } from "../../socket";

// Upload a new invoice (Partner)
export const uploadInvoice = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    console.log("[uploadInvoice] user:", user);
    console.log("[uploadInvoice] body:", req.body);
    console.log("[uploadInvoice] file:", req.file);

    if (!user || (user.role !== UserRole.PARTNER && user.role !== UserRole.ADMIN)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { invoiceNumber, date, amount } = req.body;

    if (!invoiceNumber || !date || !amount) {
      return res.status(400).json({ success: false, message: "Missing required fields", received: { invoiceNumber, date, amount } });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Invoice file is required" });
    }

    const fileUrl = `/uploads/invoices/${req.file.filename}`;

    const newInvoice = new PartnerInvoiceModel({
      partnerId: user.id,
      invoiceNumber,
      date: new Date(date),
      amount: Number(amount),
      fileUrl,
      status: "Pending"
    });

    await newInvoice.save();

    return res.status(201).json({
      success: true,
      message: "Invoice uploaded successfully",
      invoice: newInvoice
    });

  } catch (error: any) {
    console.error("Error uploading invoice:", error?.message, error?.stack);
    return res.status(500).json({ success: false, message: "Failed to upload invoice", error: error?.message });
  }
};

// Get partner-specific invoices
export const getPartnerInvoices = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const invoices = await PartnerInvoiceModel.find({ partnerId: user.id })
      .sort({ createdAt: -1 });

    const totalInvoices = invoices.length;
    let totalPaid = 0;
    let totalPending = 0;

    invoices.forEach(inv => {
      if (inv.status === "Paid") totalPaid += inv.amount;
      if (inv.status === "Pending") totalPending += inv.amount;
    });

    const totalAmount = totalPaid + totalPending;

    return res.status(200).json({
      success: true,
      data: {
        invoices,
        stats: {
          totalAmount,
          totalPaid,
          totalPending,
          countPaid: invoices.filter(i => i.status === "Paid").length,
          countPending: invoices.filter(i => i.status === "Pending").length,
          totalCount: totalInvoices
        }
      }
    });

  } catch (error: any) {
    console.error("Error fetching partner invoices:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch invoices" });
  }
};

// Get all invoices (Admin)
export const getAllInvoicesAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { partnerId, status } = req.query;

    let filter: any = {};
    if (partnerId) filter.partnerId = partnerId;
    if (status) filter.status = status;

    const invoices = await PartnerInvoiceModel.find(filter)
      .populate("partnerId", "fullName email phoneNumber")
      .sort({ createdAt: -1 });

    // Calculate stats
    let totalPaid = 0;
    let totalPending = 0;
    let countPaid = 0;
    let countPending = 0;

    invoices.forEach((inv: any) => {
      if (inv.status === "Paid") {
        totalPaid += inv.amount;
        countPaid++;
      } else {
        totalPending += inv.amount;
        countPending++;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        invoices,
        stats: {
          totalAmount: totalPaid + totalPending,
          totalPaid,
          totalPending,
          countPaid,
          countPending,
          totalCount: invoices.length
        }
      }
    });

  } catch (error: any) {
    console.error("Error fetching admin invoices:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch invoices" });
  }
};

// Mark invoice as paid (Admin)
export const markInvoicePaid = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body || {};

    console.log("[markInvoicePaid] Marking invoice as paid:", id);

    const updateData: any = { status: "Paid" };
    if (adminNote) {
      updateData.adminNote = adminNote;
    }

    const invoice = await PartnerInvoiceModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    console.log("[markInvoicePaid] Invoice updated successfully:", invoice._id);

    // Emit socket event to notify partner
    try {
      const io = getIO();
      io.to(invoice.partnerId.toString()).emit("notification:new", {
        title: "Invoice Paid",
        message: `Your invoice #${invoice.invoiceNumber} has been marked as paid!`,
        type: "SUCCESS",
        timestamp: new Date()
      });
    } catch (socketErr) {
      console.log("Socket emit failed, continuing...", socketErr);
    }

    return res.status(200).json({
      success: true,
      message: "Invoice marked as paid",
      invoice
    });

  } catch (error: any) {
    console.error("Error updating invoice status:", error?.message, error?.stack);
    return res.status(500).json({ success: false, message: "Failed to update invoice", error: error?.message });
  }
};
