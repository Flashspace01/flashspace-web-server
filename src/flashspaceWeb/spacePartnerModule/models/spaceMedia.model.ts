import mongoose, { Schema, Document } from 'mongoose';

export enum MediaType {
    IMAGE = 'image',
    VIDEO = 'video',
    VIRTUAL_TOUR = 'virtual_tour'
}

export interface ISpaceMedia extends Document {
    spaceId?: mongoose.Types.ObjectId; // Optional, can be uploaded before space creation
    partnerId: mongoose.Types.ObjectId;
    type: MediaType;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
    createdAt: Date;
}

const SpaceMediaSchema: Schema = new Schema({
    spaceId: { type: Schema.Types.ObjectId, ref: 'Space' },
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(MediaType), required: true },
    url: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

export const SpaceMedia = mongoose.model<ISpaceMedia>('SpaceMedia', SpaceMediaSchema);
