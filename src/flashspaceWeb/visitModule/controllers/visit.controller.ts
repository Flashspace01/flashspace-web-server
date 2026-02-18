import { Request, Response } from 'express';
import Visit from '../models/visit.model';

export const getVisits = async (req: Request, res: Response) => {
    try {
        const visits = await Visit.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: visits });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch visits', error });
    }
};

export const createVisit = async (req: Request, res: Response) => {
    try {
        const newVisit = new Visit(req.body);
        await newVisit.save();
        res.status(201).json({ success: true, data: newVisit });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create visit', error });
    }
};

export const updateVisitStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedVisit = await Visit.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedVisit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }

        res.status(200).json({ success: true, data: updatedVisit });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update visit status', error });
    }
};
