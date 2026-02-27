import { Request, Response, NextFunction } from 'express';

export const requireSpacePartner = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const staffRoles = ['super_admin', 'admin', 'support', 'sales', 'affiliate_manager', 'space_partner_manager'];
        if (user.role !== 'partner' && !staffRoles.includes(user.role)) {
            return res.status(403).json({ message: 'Partner or staff access required' });
        }

        next();
    } catch (error) {
        console.error('Error in requireSpacePartner middleware:', error);
        res.status(500).json({ message: 'Internal server error during authorization' });
    }
};
