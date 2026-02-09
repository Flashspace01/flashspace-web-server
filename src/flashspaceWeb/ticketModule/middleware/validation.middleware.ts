import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export class TicketValidation {
  /**
   * Validation for creating a ticket
   */
  static validateCreateTicket(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      subject: Joi.string().required().min(5).max(200).messages({
        'string.empty': 'Subject is required',
        'string.min': 'Subject must be at least 5 characters',
        'string.max': 'Subject cannot exceed 200 characters'
      }),
      description: Joi.string().required().min(10).max(2000).messages({
        'string.empty': 'Description is required',
        'string.min': 'Description must be at least 10 characters',
        'string.max': 'Description cannot exceed 2000 characters'
      }),
      category: Joi.string().valid(
        'virtual_office', 'coworking', 'billing', 'kyc',
        'technical', 'mail_services', 'bookings', 'compliance', 'other'
      ).required().messages({
        'any.only': 'Invalid category selected',
        'any.required': 'Category is required'
      }),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
      attachments: Joi.array().items(Joi.string()).optional()
    });

    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: error.details.map(detail => detail.message)
      });
    }

    req.body = value;
    next();
  }

  /**
   * Validation for replying to a ticket
   */
  static validateReply(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      message: Joi.string().required().min(1).max(2000).messages({
        'string.empty': 'Message is required',
        'string.max': 'Message cannot exceed 2000 characters'
      }),
      attachments: Joi.array().items(Joi.string()).optional()
    });

    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: error.details.map(detail => detail.message)
      });
    }

    req.body = value;
    next();
  }

  /**
   * Validation for updating ticket (admin only)
   */
  static validateUpdateTicket(req: Request, res: Response, next: NextFunction) {
    const schema = Joi.object({
      status: Joi.string().valid('open', 'in_progress', 'escalated', 'resolved', 'closed').optional(),
      assignee: Joi.string().optional(),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
      category: Joi.string().valid(
        'virtual_office', 'coworking', 'billing', 'kyc',
        'technical', 'mail_services', 'bookings', 'compliance', 'other'
      ).optional(),
      deadline: Joi.date().optional()
    });

    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: error.details.map(detail => detail.message)
      });
    }

    req.body = value;
    next();
  }
}