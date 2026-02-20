import { Request, Response } from 'express';
import Visit from '../models/visit.model';

export const getVisits = async (req: Request, res: Response) => {
    try {
        const visits = await Visit.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: visits });
    } catch (error: any) {
        console.error("Error fetching visits:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch visits',
            error: error.message || error
        });
    }
};

export const createVisit = async (req: Request, res: Response) => {
    try {
        const { client, visitor, purpose, space } = req.body;

        if (!client || !visitor || !purpose || !space) {
            return res.status(400).json({ success: false, message: 'Missing required fields: client, visitor, purpose, space' });
        }

        const visitId = `VISIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newVisit = new Visit({
            visitId,
            client,
            visitor,
            purpose,
            space,
            date: new Date(),
            status: 'Pending'
        });

        await newVisit.save();
        res.status(201).json({ success: true, data: newVisit });
    } catch (error: any) {
        console.error("Error creating visit record:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to create visit',
            error: error.message || error
        });
    }
};

export const updateVisitStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['Pending', 'Completed'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing status provided.' });
        }

        const updatedVisit = await Visit.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedVisit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }

        res.status(200).json({ success: true, data: updatedVisit });
    } catch (error: any) {
        console.error("Error updating visit status:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to update visit status',
            error: error.message || error
        });
    }
};
