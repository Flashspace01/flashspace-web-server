"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteContactForm = exports.updateContactForm = exports.getContactFormById = exports.getAllContactForm = exports.createContactForm = void 0;
const mongoose_1 = require("mongoose");
const contactForm_model_1 = require("./contactForm.model");
const createContactForm = async (req, res) => {
    try {
        let { fullName, email, phoneNumber, companyName, serviceInterest, message } = req.body;
        // const user = await ContactFormModel.findOne({
        //     email,
        //     phoneNumber
        // })
        // if (user) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "User Already Exist in database",
        //         data: {},
        //         error: "User Already Exist in database",
        //     });
        // }
        const createdContact = await contactForm_model_1.ContactFormModel.create({
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
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong !!",
            data: {},
            error: err,
        });
    }
};
exports.createContactForm = createContactForm;
const getAllContactForm = async (req, res) => {
    try {
        let query = { isDeleted: false };
        const allContacts = await contactForm_model_1.ContactFormModel.find(query).sort({ createdAt: -1 });
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
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong !!",
            data: {},
            error: err,
        });
    }
};
exports.getAllContactForm = getAllContactForm;
const getContactFormById = async (req, res) => {
    try {
        const { contactId } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(contactId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID format",
                data: {},
                error: "Invalid ObjectId",
            });
        }
        const contact = await contactForm_model_1.ContactFormModel.findOne({
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
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong !!",
            data: {},
            error: err,
        });
    }
};
exports.getContactFormById = getContactFormById;
const updateContactForm = async (req, res) => {
    try {
        const { contactId } = req.params;
        const { fullName, email, phoneNumber, companyName, serviceInterest, message, isActive } = req.body;
        if (!mongoose_1.Types.ObjectId.isValid(contactId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID format",
                data: {},
                error: "Invalid ObjectId",
            });
        }
        const updatedContact = await contactForm_model_1.ContactFormModel.findOneAndUpdate({ _id: contactId, isDeleted: false }, {
            ...(fullName && { fullName }),
            ...(email && { email }),
            ...(phoneNumber && { phoneNumber }),
            ...(companyName && { companyName }),
            ...(serviceInterest && { serviceInterest }),
            ...(message !== undefined && { message }),
            ...(isActive !== undefined && { isActive })
        }, { new: true, runValidators: true });
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
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong !!",
            data: {},
            error: err,
        });
    }
};
exports.updateContactForm = updateContactForm;
const deleteContactForm = async (req, res) => {
    try {
        const { contactId } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(contactId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID format",
                data: {},
                error: "Invalid ObjectId",
            });
        }
        const deletedContact = await contactForm_model_1.ContactFormModel.findOneAndUpdate({ _id: contactId, isDeleted: false }, {
            isDeleted: true,
            isActive: false
        }, { new: true });
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
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Something went wrong !!",
            data: {},
            error: err,
        });
    }
};
exports.deleteContactForm = deleteContactForm;
