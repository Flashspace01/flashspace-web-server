import { Router } from 'express';
import { createMail, getMails, updateMailStatus } from '../controllers/mail.controller';

const router = Router();

router.post('/', createMail);
router.get('/', getMails);
router.patch('/:id/status', updateMailStatus);

export default router;
