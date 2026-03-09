import { Request, Response } from 'express';
import { PartnerInvoice, PartnerPayment } from '../models/partnerFinancials.model';

// --- Invoices ---

export const createInvoice = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user.id;
        const { client, description, amount, dueDate, space, invoiceId } = req.body;



        if (!partnerId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if (!client || !description || !amount || !dueDate || !space) {
            return res.status(400).json({ success: false, message: "Missing required fields: client, description, amount, dueDate, space" });
        }

        // Generate Invoice ID if not provided
        const finalInvoiceId = invoiceId || `INV-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;

        // Check for duplicate Invoice ID
        const existingInvoice = await PartnerInvoice.findOne({ invoiceId: finalInvoiceId, partnerId });
        if (existingInvoice) {
            return res.status(400).json({ success: false, message: "Invoice ID already exists" });
        }

        const invoice = new PartnerInvoice({
            partnerId,
            invoiceId: finalInvoiceId,
            client,
            description,
            amount: Number(amount),
            dueDate: new Date(dueDate),
            space,
            status: 'Pending'
        });

        await invoice.save();


        res.status(201).json({ success: true, data: invoice });
    } catch (error: any) {
        console.error('[ERROR] createInvoice:', error);
        res.status(500).json({ success: false, message: 'Error creating invoice', error: error.message || error });
    }
};

export const getInvoices = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user.id;


        if (!partnerId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const invoices = await PartnerInvoice.find({ partnerId }).sort({ createdAt: -1 });


        res.json({ success: true, data: invoices });
    } catch (error: any) {
        console.error('[ERROR] getInvoices:', error);
        res.status(500).json({ success: false, message: 'Error fetching invoices', error: error.message || error });
    }
};

// --- Payments ---

export const createPayment = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user.id;
        const { client, amount, method, purpose, space, paymentId, invoiceId, commission } = req.body;



        if (!partnerId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if (!client || !amount || !method || !purpose || !space) {
            return res.status(400).json({ success: false, message: "Missing required fields: client, amount, method, purpose, space" });
        }

        // Generate Payment ID if not provided
        const finalPaymentId = paymentId || `PAY-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;

        // Check for duplicate Payment ID
        const existingPayment = await PartnerPayment.findOne({ paymentId: finalPaymentId, partnerId });
        if (existingPayment) {
            return res.status(400).json({ success: false, message: "Payment ID already exists" });
        }

        const payment = new PartnerPayment({
            partnerId,
            paymentId: finalPaymentId,
            client,
            amount: Number(amount),
            method,
            purpose,
            space,
            invoiceId: invoiceId || '',
            commission: commission ? Number(commission) : 0,
            date: new Date(),
            status: 'Completed'
        });

        await payment.save();


        res.status(201).json({ success: true, data: payment });
    } catch (error: any) {
        console.error('[ERROR] createPayment:', error);
        res.status(500).json({ success: false, message: 'Error creating payment', error: error.message || error });
    }
};

export const getPayments = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user.id;


        if (!partnerId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const payments = await PartnerPayment.find({ partnerId }).sort({ createdAt: -1 });


        res.json({ success: true, data: payments });
    } catch (error: any) {
        console.error('[ERROR] getPayments:', error);
        res.status(500).json({ success: false, message: 'Error fetching payments', error: error.message || error });
    }
};
