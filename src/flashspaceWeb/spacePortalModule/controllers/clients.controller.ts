import { Request, Response } from "express";
import { SpacePortalClientsService } from "../services/clients.service";
import { ClientPlan, ClientStatus, KycStatus } from "../models/client.model";

const clientsService = new SpacePortalClientsService();

export const createClient = async (req: Request, res: Response) => {
  const result = await clientsService.createClient(req.body);
  res.status(result.success ? 201 : 400).json(result);
};

export const getClients = async (req: Request, res: Response) => {
  const { search, status, plan, kycStatus, page, limit, includeDeleted } =
    req.query;

  const result = await clientsService.getClients({
    search: search as string | undefined,
    status: status as ClientStatus | undefined,
    plan: plan as ClientPlan | undefined,
    kycStatus: kycStatus as KycStatus | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    includeDeleted: includeDeleted === "true",
  });

  res.status(result.success ? 200 : 400).json(result);
};

export const getClientById = async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const result = await clientsService.getClientById(clientId);
  res.status(result.success ? 200 : 404).json(result);
};

export const updateClient = async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const result = await clientsService.updateClient(clientId, req.body);
  res.status(result.success ? 200 : 400).json(result);
};

export const deleteClient = async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const restore = req.query.restore === "true";
  const result = await clientsService.deleteClient(clientId, restore);
  res.status(result.success ? 200 : 400).json(result);
};
