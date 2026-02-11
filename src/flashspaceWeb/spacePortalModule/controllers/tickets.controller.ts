import { Request, Response } from "express";
import { SpacePortalTicketsService } from "../services/tickets.service";

const ticketsService = new SpacePortalTicketsService();

export const getTickets = async (req: Request, res: Response) => {
  const { search, status, priority, page, limit, includeDeleted } = req.query;

  const result = await ticketsService.getTickets({
    search: search as string | undefined,
    status: status as string | undefined,
    priority: priority as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    includeDeleted: includeDeleted === "true",
  });

  res.status(result.success ? 200 : 400).json(result);
};

export const getTicketById = async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const result = await ticketsService.getTicketById(ticketId);
  res.status(result.success ? 200 : 404).json(result);
};

export const updateTicket = async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const result = await ticketsService.updateTicket(ticketId, req.body);
  res.status(result.success ? 200 : 400).json(result);
};
