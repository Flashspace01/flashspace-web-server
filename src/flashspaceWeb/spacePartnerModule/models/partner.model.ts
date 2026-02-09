import mongoose, { Schema, Document } from 'mongoose';

export interface IPartner extends Document {
    partnerId?: string;
    companyName: string;
    contactPerson: string;
    email: string;
    phone?: string;
    address?: string; // Added
    gst?: string;     // Added
    pan?: string;     // Added
    bankAccount?: {
        accountName: string;
        accountNumber: string;
        ifsc: string;
        bankName: string;
        branch?: string;      // Added
        accountType?: string; // Added
    };
    logo?: string;
    kyc?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PartnerSchema: Schema = new Schema({
    partnerId: { type: String }, // Custom ID
    companyName: { type: String, required: true },
    contactPerson: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    address: { type: String },
    gst: { type: String },
    pan: { type: String },
    bankAccount: {
        accountName: { type: String },
        accountNumber: { type: String },
        ifsc: { type: String },
        bankName: { type: String },
        branch: { type: String },
        accountType: { type: String }
    },
    logo: { type: String },
    kyc: { type: String }
}, {
    timestamps: true
});

export const Partner = mongoose.model<IPartner>('Partner', PartnerSchema);
