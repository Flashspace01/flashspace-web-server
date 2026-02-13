import { Router } from 'express';
import { requireSpacePartner } from '../middleware/spacePartner.middleware';
import * as spaceController from '../controllers/space.controller';
import { AuthMiddleware } from '../../authModule/middleware/auth.middleware';

export const spacePartnerRoutes = Router();

// Base middleware for all space partner routes
spacePartnerRoutes.use(AuthMiddleware.authenticate);
spacePartnerRoutes.use(requireSpacePartner);

// Space management routes
spacePartnerRoutes.post('/spaces', spaceController.createSpace);
spacePartnerRoutes.get('/spaces', spaceController.getSpaces);
spacePartnerRoutes.get('/spaces/:id', spaceController.getSpaceById);
spacePartnerRoutes.put('/spaces/:id', spaceController.updateSpace);
spacePartnerRoutes.delete('/spaces/:id', spaceController.deleteSpace);


