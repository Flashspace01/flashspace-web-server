import { Router } from 'express';
import { AuthMiddleware } from '../../authModule/middleware/auth.middleware';
import { RoleMiddleware } from '../../authModule/middleware/role.middleware';
import { requireSpacePartner } from '../../spacePartnerModule/middleware/spacePartner.middleware';
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
  closeTicket,
  getPartnerTickets,
  addPartnerReply,
  partnerCloseTicket,
  partnerMessageClient,
  getAffiliateTickets,
  tapInToTicket,
  addAffiliateReply,
} from '../controllers/ticket.controller';

const router = Router();

// ============ USER ROUTES ============
router.post('/', AuthMiddleware.authenticate, RoleMiddleware.requireClientRole, TicketValidation.validateCreateTicket, createTicket);
router.get('/my-tickets', AuthMiddleware.authenticate, RoleMiddleware.requireClientRole, getUserTickets);
router.get('/:ticketId', AuthMiddleware.authenticate, RoleMiddleware.requireClientRole, getTicketById);
router.post('/:ticketId/reply', AuthMiddleware.authenticate, RoleMiddleware.requireClientRole, TicketValidation.validateReply, replyToTicket);

// ============ ADMIN ROUTES ============
router.get('/admin/all', AuthMiddleware.authenticate, RoleMiddleware.requireAdmin, getAllTickets);
router.get('/admin/stats', AuthMiddleware.authenticate, RoleMiddleware.requireAdmin, getTicketStats);
router.put('/admin/:ticketId', AuthMiddleware.authenticate, RoleMiddleware.requireAdmin, TicketValidation.validateUpdateTicket, updateTicket);
router.post('/admin/:ticketId/assign', AuthMiddleware.authenticate, RoleMiddleware.requireAdmin, assignTicket);
router.post('/admin/:ticketId/reply', AuthMiddleware.authenticate, RoleMiddleware.requireAdmin, TicketValidation.validateReply, addAdminReply);
router.post('/admin/:ticketId/escalate', AuthMiddleware.authenticate, RoleMiddleware.requireAdmin, escalateTicket);
router.post('/admin/:ticketId/resolve', AuthMiddleware.authenticate, RoleMiddleware.requireAdmin, resolveTicket);
router.post('/admin/:ticketId/close', AuthMiddleware.authenticate, RoleMiddleware.requireAdmin, closeTicket);

// ============ PARTNER ROUTES ============
router.get('/partner/all', AuthMiddleware.authenticate, requireSpacePartner, getPartnerTickets);
router.post('/partner/:ticketId/reply', AuthMiddleware.authenticate, requireSpacePartner, addPartnerReply);
router.post('/partner/:ticketId/close', AuthMiddleware.authenticate, requireSpacePartner, partnerCloseTicket);
router.post('/partner/message-client', AuthMiddleware.authenticate, requireSpacePartner, partnerMessageClient);

// ============ AFFILIATE ROUTES ============
// NOTE: these must be declared before /:ticketId to avoid route shadowing
router.get('/affiliate/my-chats', AuthMiddleware.authenticate, getAffiliateTickets);
router.post('/affiliate/:ticketId/tap-in', AuthMiddleware.authenticate, tapInToTicket);
router.post('/affiliate/:ticketId/reply', AuthMiddleware.authenticate, TicketValidation.validateReply, addAffiliateReply);

export { router as ticketRoutes };