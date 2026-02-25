import mongoose, { Schema, Document } from 'mongoose';

export interface IPartnerInvoice extends Document {
    partnerId: mongoose.Types.ObjectId;
    invoiceId: string;
    client: string; // Client Name
    description: string;
    amount: number;
    dueDate: Date;
    status: 'Pending' | 'Paid' | 'Overdue' | 'Cancelled';
    space: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IPartnerPayment extends Document {
    partnerId: mongoose.Types.ObjectId;
    paymentId: string;
    client: string; // Client Name
    amount: number;
    method: 'Cash' | 'UPI' | 'Transfer' | 'Cheque';
    purpose: string;
    space: string; // Space Name
    date: Date;
    invoiceId?: string; // Optional reference to an invoice
    commission?: number;
    status: 'Completed' | 'Pending' | 'Failed';
    createdAt: Date;
    updatedAt: Date;
}

const PartnerInvoiceSchema: Schema = new Schema({
    partnerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Partner ID is required']
    },
    invoiceId: {
        type: String,
        required: [true, 'Invoice ID is required'],
        unique: true,
        trim: true
    },
    client: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Paid', 'Overdue', 'Cancelled'],
        default: 'Pending'
    },
    space: { type: String, required: true }
}, {
    timestamps: true
});

const PartnerPaymentSchema: Schema = new Schema({
    partnerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Partner ID is required']
    },
    paymentId: {
        type: String,
        required: [true, 'Payment ID is required'],
        unique: true,
        trim: true
    },
    client: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
        type: String,
        enum: ['Cash', 'UPI', 'Transfer', 'Cheque'],
        required: true
    },
    purpose: { type: String, required: true },
    space: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    invoiceId: { type: String, default: '' },
    commission: { type: Number, default: 0, min: 0 },
    status: {
        type: String,
        enum: ['Completed', 'Pending', 'Failed'],
        default: 'Completed'
    }
}, {
    timestamps: true
});

// Create indexes for faster queries
PartnerInvoiceSchema.index({ partnerId: 1, createdAt: -1 });
PartnerPaymentSchema.index({ partnerId: 1, createdAt: -1 });

export const PartnerInvoice = mongoose.model<IPartnerInvoice>('PartnerInvoice', PartnerInvoiceSchema);
export const PartnerPayment = mongoose.model<IPartnerPayment>('PartnerPayment', PartnerPaymentSchema);
