import mongoose, { Schema, Document } from 'mongoose';

export interface IVisit extends Document {
    client: string;
    visitor: string;
    purpose: string;
    space: string;
    date: Date;
    status: 'Pending' | 'Completed';
    createdAt: Date;
    updatedAt: Date;
}

const VisitSchema: Schema = new Schema({
    client: { type: String, required: true },
    visitor: { type: String, required: true },
    purpose: { type: String, required: true },
    space: { type: String, required: true },
    date: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['Pending', 'Completed'],
        default: 'Pending'
    },
}, { timestamps: true });

export default mongoose.model<IVisit>('Visit', VisitSchema);
