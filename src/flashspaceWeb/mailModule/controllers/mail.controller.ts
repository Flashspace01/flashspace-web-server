import { Request, Response } from 'express';
import Mail from '../models/mail.model';

export const createMail = async (req: Request, res: Response) => {
    try {
        // console.log("createMail - Payload:", JSON.stringify(req.body, null, 2));
        const { client, sender, type, space } = req.body;

        if (!client || !sender || !type || !space) {
            return res.status(400).json({ success: false, message: 'Missing required fields: client, sender, type, space' });
        }

        const mailId = `MAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newMail = new Mail({
            mailId,
            client,
            sender,
            type,
            space,
            received: new Date(),
            status: 'Pending Action'
        });

        await newMail.save();
        res.status(201).json({ success: true, data: newMail });
    } catch (error: any) {
        console.error("Error creating mail record:", error);
        if (error.name === 'ValidationError') {
            console.error("Validation Errors:", JSON.stringify(error.errors, null, 2));
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create mail record',
            error: error.message || error,
            details: error.errors // valid for mongoose validation errors
        });
    }
};

export const getMails = async (req: Request, res: Response) => {
    try {
        const mails = await Mail.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: mails });
    } catch (error: any) {
        console.error("Error fetching mail records:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch mail records',
            error: error.message || error
        });
    }
};

export const updateMailStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['Pending Action', 'Forwarded', 'Collected'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing status provided.' });
        }

        const updatedMail = await Mail.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedMail) {
            return res.status(404).json({ success: false, message: 'Mail record not found' });
        }

        res.status(200).json({ success: true, data: updatedMail });
    } catch (error: any) {
        console.error("Error updating mail status:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to update mail status',
            error: error.message || error
        });
    }
};
