import { SpaceMedia, MediaType } from '../models/spaceMedia.model';
import mongoose from 'mongoose';

export class SpaceMediaService {
    async createMedia(data: {
        partnerId: string;
        type: MediaType;
        url: string;
        filename: string;
        mimeType: string;
        size: number;
        spaceId?: string;
    }) {
        const media = new SpaceMedia(data);
        return await media.save();
    }

    async getMediaBySpaceId(spaceId: string) {
        return await SpaceMedia.find({ spaceId });
    }

    async deleteMedia(mediaId: string, partnerId: string) {
        const media = await SpaceMedia.findOne({ _id: mediaId, partnerId });
        if (!media) {
            throw new Error('Media not found or unauthorized');
        }
        // TODO: Delete actual file from storage (if local or cloud)
        await media.deleteOne();
        return true;
    }

    async assignMediaToSpace(mediaIds: string[], spaceId: string, partnerId: string) {
        await SpaceMedia.updateMany(
            { _id: { $in: mediaIds }, partnerId },
            { $set: { spaceId } }
        );
    }
}
