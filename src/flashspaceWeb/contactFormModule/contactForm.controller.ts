import { Request, Response } from "express";
import { ContactFormModel } from "./contactForm.model";

export const createContactForm = async (req: Request, res: Response) => {
    try {
        let {
            fullName,
            email,
            phoneNumber,
            companyName,
            serviceInterest,
            message
        } = req.body;
        const createdContact = await ContactFormModel.create({
            fullName,
            email,
            phoneNumber,
            companyName,
            serviceInterest,
            message
        });
        if (!createdContact) {
            return res.status(400).json({
                success: false,
                message: "Issue with database",
                data: {},
                error: "Issue with Database",
            });
        }

        res.status(201).json({
            success: true,
            message: "Contact created successfully",
            data: createdContact,
            error: {},
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong !!",
            data: {},
            error: err,
        });
    }
}

export const getAllContactForm = async (req: Request, res: Response) => {
    try {
        let query: any = { isDeleted: false };
        const allContacts = await ContactFormModel.find(query).sort({ createdAt: -1 });
        if (allContacts.length === 0) {
            return res.status(500).json({
                success: false,
                message: "Can't retrieve data !!",
                data: {},
                error: "Can't retrieve data",
            });
        }
        res.status(201).json({
            success: true,
            message: "Contact retrieved successfully",
            data: allContacts,
            error: {},
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong !!",
            data: {},
            error: err,
        });
    }
}