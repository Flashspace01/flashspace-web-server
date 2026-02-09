import { Router } from 'express';
import { AuthMiddleware } from '../../authModule/middleware/auth.middleware';
import { RoleMiddleware } from '../../authModule/middleware/role.middleware';
import { TicketValidation } from '../middleware/validation.middleware';
import {
  createTicket,
  getUserTickets,
  getTicketById,
  replyToTicket,
  getAllTickets,
  getTicketStats,
  updateTicket,
  assignTicket,
  addAdminReply,
  escalateTicket,
  resolveTicket,
  closeTicket
} from '../controllers/ticket.controller';

const router = Router();

// ============ USER ROUTES ============
// Create a new ticket (both users and admins can create tickets)
router.post(
  '/',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdminOrUser,
  TicketValidation.validateCreateTicket,
  createTicket
);

// Get user's own tickets (both users and admins can view their own tickets)
router.get(
  '/my-tickets',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdminOrUser,
  getUserTickets
);

// Get specific ticket (user can only see their own)
router.get(
  '/:ticketId',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdminOrUser,
  getTicketById
);

// Reply to a ticket
router.post(
  '/:ticketId/reply',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdminOrUser,
  TicketValidation.validateReply,
  replyToTicket
);

// ============ ADMIN ROUTES ============
// Get all tickets (admin only)
router.get(
  '/admin/all',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdmin,
  getAllTickets
);

// Get ticket statistics
router.get(
  '/admin/stats',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdmin,
  getTicketStats
);

// Update ticket (admin only)
router.put(
  '/admin/:ticketId',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdmin,
  TicketValidation.validateUpdateTicket,
  updateTicket
);

// Assign ticket
router.post(
  '/admin/:ticketId/assign',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdmin,
  assignTicket
);

// Add admin reply
router.post(
  '/admin/:ticketId/reply',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdmin,
  TicketValidation.validateReply,
  addAdminReply
);

// Escalate ticket
router.post(
  '/admin/:ticketId/escalate',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdmin,
  escalateTicket
);

// Resolve ticket
router.post(
  '/admin/:ticketId/resolve',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdmin,
  resolveTicket
);

// Close ticket
router.post(
  '/admin/:ticketId/close',
  AuthMiddleware.authenticate,
  RoleMiddleware.requireAdmin,
  closeTicket
);

export { router as ticketRoutes };