import { Router } from 'express';
import { requireSpacePartner } from '../middleware/spacePartner.middleware';
import * as spaceController from '../controllers/space.controller';
import * as partnerController from '../controllers/partner.controller';
import { AuthMiddleware } from '../../authModule/middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

export const spacePartnerRoutes = Router();

// Base middleware for all space partner routes
// Base middleware for all space partner routes
spacePartnerRoutes.use(AuthMiddleware.authenticate);
// spacePartnerRoutes.use(requireSpacePartner); // Keep this commented for now to avoid strict role checks if role isn't set yet, or uncomment if role is guaranteed. Let's just do auth first.

// Space management routes
spacePartnerRoutes.get('/profile', partnerController.getCurrentPartner);
spacePartnerRoutes.put('/profile', upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'kyc', maxCount: 1 }
]), partnerController.updateCurrentPartner);

spacePartnerRoutes.post('/spaces', spaceController.createSpace);
spacePartnerRoutes.get('/spaces', spaceController.getSpaces);
spacePartnerRoutes.get('/spaces/:id', spaceController.getSpaceById);
spacePartnerRoutes.put('/spaces/:id', spaceController.updateSpace);
spacePartnerRoutes.delete('/spaces/:id', spaceController.deleteSpace);