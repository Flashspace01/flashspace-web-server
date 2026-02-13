import { Request, Response, NextFunction } from 'express';

export const requireSpacePartner = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (user.role !== 'partner') {
            return res.status(403).json({ message: 'Partner access required' });
        }

        next();
    } catch (error) {
        console.error('Error in requireSpacePartner middleware:', error);
        res.status(500).json({ message: 'Internal server error during authorization' });
    }
};
