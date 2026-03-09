import { Router } from 'express';
import { getVisits, createVisit, updateVisitStatus } from '../controllers/visit.controller';
import { AuthMiddleware } from '../../authModule/middleware/auth.middleware';

const router = Router();

router.get('/', AuthMiddleware.authenticate, getVisits);
router.post('/', AuthMiddleware.authenticate, createVisit);
router.patch('/:id/status', AuthMiddleware.authenticate, updateVisitStatus);

export default router;
