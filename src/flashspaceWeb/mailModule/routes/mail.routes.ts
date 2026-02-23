import { Router } from 'express';
import { createMail, getMails, updateMailStatus } from '../controllers/mail.controller';
import { AuthMiddleware } from '../../authModule/middleware/auth.middleware';

const router = Router();

router.post('/', AuthMiddleware.authenticate, createMail);
router.get('/', AuthMiddleware.authenticate, getMails);
router.patch('/:id/status', AuthMiddleware.authenticate, updateMailStatus);

export default router;
