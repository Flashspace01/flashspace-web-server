import mongoose, { Schema, Document } from 'mongoose';

export interface IMail extends Document {
    mailId: string;
    client: string;
    sender: string;
    type: string;
    space: string;
    received: Date;
    status: 'Pending Action' | 'Forwarded' | 'Collected';
    createdAt: Date;
    updatedAt: Date;
}

const MailSchema: Schema = new Schema({
    mailId: { type: String },
    client: { type: String, required: true },
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
