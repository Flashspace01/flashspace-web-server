import { Request, Response } from "express";
import { AffiliateCampaignModel } from "../models/affiliateCampaign.model";

export const getMarketingStats = async (req: Request, res: Response) => {
  try {
    const affiliateId = req.user?.id;
    if (!affiliateId) return res.status(401).json({ message: "Unauthorized" });

    const campaigns = await AffiliateCampaignModel.find({ affiliateId });
    res.status(200).json(campaigns);
  } catch (error) {
    res.status(500).json({ message: "Error fetching marketing stats" });
  }
};

export const createCampaign = async (req: Request, res: Response) => {
    try {
        const affiliateId = req.user?.id;
        if (!affiliateId) return res.status(401).json({ message: "Unauthorized" });
        
        const { name, slug } = req.body;
        const newCampaign = await AffiliateCampaignModel.create({ affiliateId, name, slug });
        res.status(201).json(newCampaign);
    } catch (error) {
        res.status(500).json({ message: "Error creating campaign" });
    }
}
