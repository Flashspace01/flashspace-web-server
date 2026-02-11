import { Request, Response } from "express";
import { SpacePortalInvoicesService } from "../services/invoices.service";

const invoicesService = new SpacePortalInvoicesService();

export const getInvoices = async (req: Request, res: Response) => {
  const { status, fromDate, toDate, page, limit } = req.query;

  const result = await invoicesService.getInvoices({
    status: status as string | undefined,
    fromDate: fromDate ? new Date(fromDate as string) : undefined,
    toDate: toDate ? new Date(toDate as string) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.status(result.success ? 200 : 400).json(result);
};

export const getInvoiceById = async (req: Request, res: Response) => {
  const { invoiceId } = req.params;
  const result = await invoicesService.getInvoiceById(invoiceId);
  res.status(result.success ? 200 : 404).json(result);
};

export const createInvoice = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const result = await invoicesService.createInvoice({
    ...req.body,
    user: userId,
  });
  res.status(result.success ? 201 : 400).json(result);
};
