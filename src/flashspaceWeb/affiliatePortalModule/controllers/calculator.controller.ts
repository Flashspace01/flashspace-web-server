import { Request, Response } from "express";
import { CoworkingSpaceModel } from "../../coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../../virtualOfficeModule/virtualOffice.model";

export const getCalculatorSpaces = async (req: Request, res: Response): Promise<void> => {
    try {
        const affiliateId = req.user?.id;
        const staffRoles = ["super_admin", "admin", "support", "sales", "affiliate_manager", "space_partner_manager"];
        const isAdmin = staffRoles.includes(req.user?.role as string);

        if (!affiliateId && !isAdmin) {
            res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
            return;
        }

        // Fetch all active spaces and populate property to get the name, city, and address
        const voSpaces = await VirtualOfficeModel.find({ isDeleted: false, isActive: true })
            .populate("property", "name city address spaceId")
            .select("property finalBrPricePerYear partnerBrPricePerYear")
            .lean();

        // Format Virtual Offices (BR Plan)
        const formattedVOs = voSpaces.map((space: any) => {
            if (!space.property || !space.property.name) return null;
            
            const spaceId = space.property.spaceId;
            const isRestricted = spaceId === 'FSDL08' || (spaceId && spaceId.startsWith('FSKOL'));
            const maxDiscount = isRestricted ? 25 : 30;

            return {
                name: space.property.name,
                city: space.property.city || "",
                address: space.property.address || "",
                planName: "BR Plan",
                price: space.finalBrPricePerYear || 0,
                partnerPrice: space.partnerBrPricePerYear || 0,
                maxDiscount,
                spaceId
            };
        }).filter(Boolean);

        res.status(200).json({
            success: true,
            data: formattedVOs,
        });
    } catch (error: any) {
        console.error("Fetch Calculator Spaces Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch spaces",
            error: error.message,
        });
    }
};
