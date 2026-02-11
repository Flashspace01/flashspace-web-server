import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Validation schemas
const availabilitySchema = Joi.object({
    days: Joi.number().integer().min(1).max(30).default(7)
});

const bookingSchema = Joi.object({
    fullName: Joi.string().trim().min(2).max(100).required()
        .messages({
            'string.empty': 'Full name is required',
            'string.min': 'Full name must be at least 2 characters',
            'any.required': 'Full name is required'
        }),
    email: Joi.string().email().required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
    phoneNumber: Joi.string().pattern(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/).required()
        .messages({
            'string.pattern.base': 'Please provide a valid phone number',
            'any.required': 'Phone number is required'
        }),
    slotTime: Joi.date().iso().required()
        .messages({
            'date.format': 'Please provide a valid date in ISO format',
            'any.required': 'Slot time is required'
        }),
    notes: Joi.string().max(500).optional()
});

// Middleware functions
export const validateAvailabilityRequest = (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = availabilitySchema.validate(req.query, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            data: {},
            error: error.details.map(detail => detail.message)
        });
    }

    // Store validated values in res.locals instead of reassigning req.query (Express 5 compatibility)
    res.locals.validatedQuery = value;
    next();
};

export const validateBooking = (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = bookingSchema.validate(req.body, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            data: {},
            error: error.details.map(detail => detail.message)
        });
    }

    // Store validated values in res.locals instead of reassigning req.body (Express 5 compatibility)
    res.locals.validatedBody = value;
    next();
};
