"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllContactForm = exports.createContactForm = void 0;
const contactForm_model_1 = require("./contactForm.model");
const createContactForm = async (req, res) => {
    try {
        let { fullName, email, phoneNumber, companyName, serviceInterest, message } = req.body;
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
