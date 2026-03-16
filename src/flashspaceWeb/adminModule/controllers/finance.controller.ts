import { Request, Response } from "express";
import { InvoiceModel } from "../../invoiceModule/invoice.model";
import { PartnerInvoice, PartnerPayment } from "../../spacePartnerModule/models/partnerFinancials.model";
import mongoose from "mongoose";

export class FinanceController {
    // GET /api/admin/finance/summary
    static async getFinanceSummary(req: Request, res: Response) {
        try {
            const now = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(now.getDate() + 7);

            // 1. Fetch Receivables (from Invoices)
            const pendingInvoices = await InvoiceModel.find({
                status: { $in: ["pending", "overdue"] },
                isDeleted: false
            }).populate('user', 'fullName email');

            const totalReceivable = pendingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
            const overdueReceivable = pendingInvoices
                .filter(inv => inv.dueDate && inv.dueDate < now)
                .reduce((sum, inv) => sum + (inv.total || 0), 0);

            const receivables = pendingInvoices.map(inv => ({
                _id: inv._id,
                client: (inv.user as any)?.fullName || "Unknown",
                email: (inv.user as any)?.email || "",
                amount: inv.total,
                bookingNumber: inv.bookingNumber || inv.invoiceNumber,
                type: inv.description,
                dueDate: inv.dueDate,
                ageDays: inv.dueDate ? Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24)) : 0,
                status: inv.dueDate && inv.dueDate < now ? "overdue" : "current"
            }));

            // 2. Fetch Payables (from Partner Invoices)
            const pendingPartnerInvoices = await PartnerInvoice.find({
                status: "Pending"
            });

            const totalPayable = pendingPartnerInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
            const dueThisWeek = pendingPartnerInvoices
                .filter(inv => inv.dueDate && inv.dueDate <= nextWeek)
                .reduce((sum, inv) => sum + (inv.amount || 0), 0);

            const payables = pendingPartnerInvoices.map(inv => ({
                partner: inv.partnerId.toString(), // Ideally populate name, but start with ID
                city: inv.space || "",
                amount: inv.amount,
                totalRevenue: inv.amount, // Placeholder
                bookingCount: 1, // Placeholder
                dueDate: inv.dueDate,
                ageDays: inv.dueDate ? Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24)) : 0,
                status: inv.dueDate && inv.dueDate < now ? "overdue" : "pending"
            }));

            res.status(200).json({
                success: true,
                data: {
                    metrics: {
                        totalReceivable,
                        overdueReceivable,
                        totalPayable,
                        dueThisWeek
                    },
                    receivables,
                    payables
                }
            });
        } catch (error: any) {
            console.error("Finance Summary Error:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // GET /api/admin/finance/balance-sheet
    static async getBalanceSheet(req: Request, res: Response) {
        try {
            const invoices = await InvoiceModel.find({ status: "paid", isDeleted: false });
            const payments = await PartnerPayment.find({ status: "Completed" });

            const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
            const totalExpenses = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const totalProfit = totalRevenue - totalExpenses;

            // Simple Monthly Breakdown (last 6 months)
            const monthlyBreakdown = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const monthYear = d.toLocaleString('default', { month: 'short', year: '2-digit' });

                // Mock data for now to ensure UI works, could be aggregated later
                monthlyBreakdown.push({
                    month: monthYear,
                    revenue: Math.floor(totalRevenue / 6),
                    expenses: Math.floor(totalExpenses / 6),
                    profit: Math.floor(totalProfit / 6)
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    overallSummary: [
                        { label: "Total Revenue", amount: totalRevenue, type: "credit" },
                        { label: "Total Expenses", amount: totalExpenses, type: "debit" },
                        { label: "Net Profit", amount: totalProfit, type: "profit" }
                    ],
                    monthlyBreakdown,
                    cityBreakdown: [
                        { city: "Bangalore", revenue: totalRevenue, expenses: totalExpenses, profit: totalProfit, margin: "15%" }
                    ]
                }
            });

        } catch (error: any) {
            console.error("Balance Sheet Error:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
