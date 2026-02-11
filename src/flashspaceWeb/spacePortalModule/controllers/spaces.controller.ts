import { Request, Response } from "express";
import { SpacePortalSpacesService } from "../services/spaces.service";
import { SpacePortalSpaceStatus } from "../models/space.model";

const spacesService = new SpacePortalSpacesService();

export const createSpace = async (req: Request, res: Response) => {
  const result = await spacesService.createSpace(req.body);
  res.status(result.success ? 201 : 400).json(result);
};

export const getSpaces = async (req: Request, res: Response) => {
  const { search, status, city, page, limit, includeDeleted } = req.query;

  const result = await spacesService.getSpaces({
    search: search as string | undefined,
    status: status as SpacePortalSpaceStatus | undefined,
    city: city as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    includeDeleted: includeDeleted === "true",
  });

  res.status(result.success ? 200 : 400).json(result);
};

export const getSpaceById = async (req: Request, res: Response) => {
  const { spaceId } = req.params;
  const result = await spacesService.getSpaceById(spaceId);
  res.status(result.success ? 200 : 404).json(result);
};

export const updateSpace = async (req: Request, res: Response) => {
  const { spaceId } = req.params;
  const result = await spacesService.updateSpace(spaceId, req.body);
  res.status(result.success ? 200 : 400).json(result);
};

export const deleteSpace = async (req: Request, res: Response) => {
  const { spaceId } = req.params;
  const restore = req.query.restore === "true";
  const result = await spacesService.deleteSpace(spaceId, restore);
  res.status(result.success ? 200 : 400).json(result);
};
