import { Router } from 'express';
import { createMail, getMails, updateMailStatus } from '../controllers/mail.controller';
import { AuthMiddleware } from '../../authModule/middleware/auth.middleware';
import { uploadMailDocument } from '../config/multer.config';

const router = Router();

router.post(
	'/',
	AuthMiddleware.authenticate,
	uploadMailDocument.single('file'),
	createMail,
);
router.get('/', AuthMiddleware.authenticate, getMails);
router.patch('/:id/status', AuthMiddleware.authenticate, updateMailStatus);

export default router;
