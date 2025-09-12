import { Request, Response } from "express";
import { Types } from "mongoose";
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

export const getContactFormById = async (req: Request, res: Response) => {
    try {
        const { contactId } = req.params;

        if (!Types.ObjectId.isValid(contactId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID format",
                data: {},
                error: "Invalid ObjectId",
            });
        }

        const contact = await ContactFormModel.findOne({
            _id: contactId,
            isDeleted: false
        });

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
                data: {},
                error: "Contact not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Contact retrieved successfully",
            data: contact,
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

export const updateContactForm = async (req: Request, res: Response) => {
    try {
        const { contactId } = req.params;
        const {
            fullName,
            email,
            phoneNumber,
            companyName,
            serviceInterest,
            message,
            isActive
        } = req.body;

        if (!Types.ObjectId.isValid(contactId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID format",
                data: {},
                error: "Invalid ObjectId",
            });
        }

        const updatedContact = await ContactFormModel.findOneAndUpdate(
            { _id: contactId, isDeleted: false },
            {
                ...(fullName && { fullName }),
                ...(email && { email }),
                ...(phoneNumber && { phoneNumber }),
                ...(companyName && { companyName }),
                ...(serviceInterest && { serviceInterest }),
                ...(message !== undefined && { message }),
                ...(isActive !== undefined && { isActive })
            },
            { new: true, runValidators: true }
        );

        if (!updatedContact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
                data: {},
                error: "Contact not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Contact updated successfully",
            data: updatedContact,
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

export const deleteContactForm = async (req: Request, res: Response) => {
    try {
        const { contactId } = req.params;

        if (!Types.ObjectId.isValid(contactId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID format",
                data: {},
                error: "Invalid ObjectId",
            });
        }

        const deletedContact = await ContactFormModel.findOneAndUpdate(
            { _id: contactId, isDeleted: false },
            {
                isDeleted: true,
                isActive: false
            },
            { new: true }
        );

        if (!deletedContact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
                data: {},
                error: "Contact not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Contact deleted successfully",
            data: deletedContact,
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