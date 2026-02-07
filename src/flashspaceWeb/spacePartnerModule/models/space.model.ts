import mongoose, { Schema, Document } from 'mongoose';

export enum SpaceStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    DRAFT = 'draft'
}

export enum PricingType {
    HOURLY = 'hourly',
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly'
}

export interface ISpace extends Document {
    partnerId: mongoose.Types.ObjectId;
    name: string;
    description: string;
    location: {
        address: string;
        city: string;
        state: string;
        country: string;
        zipCode: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
    };
    category: string; // e.g., 'Meeting Room', 'Private Office', 'Desk'
    capacity: number;
    amenities: string[];
    pricing: {
        type: PricingType;
        amount: number;
        currency: string;
    }[];
    status: SpaceStatus;
    images: mongoose.Types.ObjectId[]; // References to SpaceMedia
    videos: mongoose.Types.ObjectId[]; // References to SpaceMedia
    virtualTourUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SpaceSchema: Schema = new Schema({
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    location: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String },
        country: { type: String },
        zipCode: { type: String },
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    category: { type: String, required: true },
    capacity: { type: Number, required: true },
    amenities: [{ type: String }],
    pricing: [{
        type: { type: String, enum: Object.values(PricingType), required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'INR' }
    }],
    status: { type: String, enum: Object.values(SpaceStatus), default: SpaceStatus.DRAFT },
    images: [{ type: Schema.Types.ObjectId, ref: 'SpaceMedia' }],
    videos: [{ type: Schema.Types.ObjectId, ref: 'SpaceMedia' }],
    virtualTourUrl: { type: String }
}, {
    timestamps: true
});

export const Space = mongoose.model<ISpace>('Space', SpaceSchema);
