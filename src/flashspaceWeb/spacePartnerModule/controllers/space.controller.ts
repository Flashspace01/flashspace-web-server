import { Request, Response } from 'express';
import { Space, SpaceStatus } from '../models/space.model';
import { SpaceMediaService } from '../services/spaceMedia.service';

const spaceMediaService = new SpaceMediaService();

export const createSpace = async (req: Request, res: Response) => {
    try {
        console.log('[createSpace] Request body:', req.body);

        // Mock partnerId for testing without auth
        const partnerId = (req as any).user?.id || "507f1f77bcf86cd799439011";

        if (!req.body) {
            return res.status(400).json({ message: 'Request body is missing' });
        }

        const { mediaIds, ...spaceData } = req.body;

        const space = new Space({
            ...spaceData,
            partnerId,
            status: SpaceStatus.DRAFT // Default to draft
        });

        await space.save();

        if (mediaIds && Array.isArray(mediaIds)) {
            await spaceMediaService.assignMediaToSpace(mediaIds, space._id as string, partnerId);
        }

        res.status(201).json(space);
    } catch (error) {
        console.error('Error creating space:', error);
        res.status(500).json({ message: 'Error creating space', error });
    }
};

export const getSpaces = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user?.id || "507f1f77bcf86cd799439011";
        console.log(`[getSpaces] Fetching spaces for partnerId: ${partnerId}`);
        const spaces = await Space.find({ partnerId }).sort({ createdAt: -1 });
        console.log(`[getSpaces] Found ${spaces.length} spaces`);
        res.json(spaces);
    } catch (error) {
        console.error('Error fetching spaces (DETAILS):', JSON.stringify(error, null, 2));
        if (error instanceof Error) {
            console.error('Error stack:', error.stack);
            console.error('Error message:', error.message);
        }
        res.status(500).json({
            message: 'Error fetching spaces',
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        });
    }
};

export const getSpaceById = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user?.id || "507f1f77bcf86cd799439011";
        const { id } = req.params;
        const space = await Space.findOne({ _id: id, partnerId }).populate('images').populate('videos');

        if (!space) {
            return res.status(404).json({ message: 'Space not found' });
        }

        res.json(space);
    } catch (error) {
        console.error('Error fetching space:', error);
        res.status(500).json({ message: 'Error fetching space', error });
    }
};

export const updateSpace = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user?.id || "507f1f77bcf86cd799439011";
        const { id } = req.params;
        const updates = req.body;

        const space = await Space.findOne({ _id: id, partnerId });
        if (!space) {
            return res.status(404).json({ message: 'Space not found' });
        }

        Object.assign(space, updates);
        await space.save();

        res.json(space);
    } catch (error) {
        console.error('Error updating space:', error);
        res.status(500).json({ message: 'Error updating space', error });
    }
};

export const deleteSpace = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user?.id || "507f1f77bcf86cd799439011";
        const { id } = req.params;

        const space = await Space.findOne({ _id: id, partnerId });
        if (!space) {
            return res.status(404).json({ message: 'Space not found' });
        }

        // Soft delete implementation? Or Hard delete?
        // User asked for "Active / Inactive / Draft", so maybe just set to INACTIVE if "deleting" or allow hard delete if it's draft.
        // For now, let's implement hard delete but we should probably check for bookings. 
        // Given this is Phase 1 and "control status" is a requirement, likely we just use updateSpace to change status.
        // But for a true DELETE route:

        await space.deleteOne();
        res.json({ message: 'Space deleted successfully' });
    } catch (error) {
        console.error('Error deleting space:', error);
        res.status(500).json({ message: 'Error deleting space', error });
    }
};
