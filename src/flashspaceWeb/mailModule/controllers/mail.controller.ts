import { Request, Response } from 'express';
import Mail from '../models/mail.model';

export const createMail = async (req: Request, res: Response) => {
    try {
        const { client, email, sender, type, space } = req.body;

        if (!client || !email || !sender || !type || !space) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const newMail = new Mail({
            client,
            email: email.trim(), // Sanitize email
            sender,
            type,
            space,
            received: new Date(),
            status: 'Pending Action'
        });

        await newMail.save();
        res.status(201).json({ success: true, data: newMail });
    } catch (error) {
        console.error('[createMail] Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create mail record', error });
    }
};

export const getMails = async (req: Request, res: Response) => {
    try {
        const mails = await Mail.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: mails });
    } catch (error) {
        console.error('[getMails] Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch mail records', error });
    }
};

export const updateMailStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedMail = await Mail.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedMail) {
            return res.status(404).json({ success: false, message: 'Mail record not found' });
        }

        res.status(200).json({ success: true, data: updatedMail });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update mail status', error });
    }
};
