import { Request, Response } from "express";
import { SpacePortalClientDetailsService } from "../services/clientDetails.service";

const clientDetailsService = new SpacePortalClientDetailsService();

export const getClientDetails = async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const result = await clientDetailsService.getClientDetails(clientId);
  res.status(result.success ? 200 : 404).json(result);
};
