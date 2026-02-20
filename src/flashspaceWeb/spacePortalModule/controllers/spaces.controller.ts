import { Request, Response } from "express";
import { SpacePortalSpacesService } from "../services/spaces.service";

const spacesService = new SpacePortalSpacesService();

export const getSpaces = async (req: Request, res: Response) => {
  const { search, city, page, limit, includeDeleted } = req.query;
  const partnerId = req.user?.role === "partner" ? req.user.id : undefined;

  const result = await spacesService.getSpaces(
    {
      search: search as string | undefined,
      city: city as string | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      includeDeleted: includeDeleted === "true",
    },
    partnerId as string,
  );

  res.status(result.success ? 200 : 400).json(result);
};

export const getSpaceById = async (req: Request, res: Response) => {
  const { spaceId } = req.params;
  const partnerId = req.user?.role === "partner" ? req.user.id : undefined;
  const result = await spacesService.getSpaceById(spaceId, partnerId);
  res.status(result.success ? 200 : 404).json(result);
};
