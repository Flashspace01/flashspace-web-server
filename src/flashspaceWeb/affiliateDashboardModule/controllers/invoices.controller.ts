import { Request, Response } from "express";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { InvoiceModel } from "../models/invoices.models";

/**
 * Get Invoice Stats
 * Returns: Total Invoiced, Paid, Pending, Overdue
 */
export const getInvoiceStats = async (req: Request, res: Response) => {
    try {
        const matchQuery = {};

        const allBookings = await BookingModel.find({
            ...matchQuery,
            status: { $nin: ['cancelled'] }
        }).populate("plan");

        let totalInvoiced = 0;
        let pendingAmount = 0;

        allBookings.forEach(booking => {
            const plan = booking.plan as any;
            if (plan && plan.price) {
                const commission = plan.price * 0.10;
                totalInvoiced += commission;

                if (booking.status === 'pending_payment') {
                    pendingAmount += commission;
                }
            }
        });

        const paidAmount = totalInvoiced - pendingAmount;
        const overdueAmount = 0; // Mock

        return res.status(200).json({
            success: true,
            data: {
                totalInvoiced,
                paidAmount,
                pendingAmount,
                overdueAmount
            }
        });

    } catch (error) {
        console.error("Error fetching invoice stats:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Get Invoices List
 */
export const getInvoices = async (req: Request, res: Response) => {
    try {
        // Filter: e.g. only invoices for this user's bookings (if affiliate view)
        // For now, simple list
        const invoices = await InvoiceModel.find({ isDeleted: false }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: invoices
        });

    } catch (error) {
        console.error("Error fetching invoices:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Generate/Create Invoice (POST)
 */
export const createInvoice = async (req: Request, res: Response) => {
    try {
        const { bookingId, description, lineItems, subtotal, total, billingAddress } = req.body;
        const userId = req.user?.id;

        const count = await InvoiceModel.countDocuments();
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

        const newInvoice = await InvoiceModel.create({
            invoiceNumber,
            user: userId,
            bookingId,
            description,
            lineItems,
            subtotal,
            total,
            billingAddress,
            status: 'pending',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days due
        });

        return res.status(201).json({
            success: true,
            message: "Invoice generated successfully",
            data: newInvoice
        });
    } catch (error) {
        console.error("Error creating invoice:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Update Invoice (PUT)
 */
export const updateInvoice = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const invoice = await InvoiceModel.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: new Date() },
            { new: true }
        );

        if (!invoice) {
            return res.status(404).json({ success: false, message: "Invoice not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Invoice updated successfully",
            data: invoice
        });
    } catch (error) {
        console.error("Error updating invoice:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Delete/Void Invoice (DELETE)
 */
export const deleteInvoice = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const invoice = await InvoiceModel.findByIdAndUpdate(
            id,
            { isDeleted: true, status: 'cancelled' },
            { new: true }
        );

        if (!invoice) {
            return res.status(404).json({ success: false, message: "Invoice not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Invoice voided/deleted successfully",
            data: invoice
        });
    } catch (error) {
        console.error("Error deleting invoice:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
