import mongoose, { Schema, Document } from 'mongoose';

export interface IMail extends Document {
    client: string;
    email: string;
    sender: string;
    type: string;
    space: string;
    received: Date;
    status: 'Pending Action' | 'Forwarded' | 'Collected';
    updatedAt: Date;
}

const MailSchema: Schema = new Schema({
    client: { type: String, required: true },
    email: { type: String, required: true },
    sender: { type: String, required: true },
    type: { type: String, required: true },
    space: { type: String, required: true },
    received: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['Pending Action', 'Forwarded', 'Collected'],
        default: 'Pending Action'
    },
}, { timestamps: true });

export default mongoose.model<IMail>('Mail', MailSchema);
