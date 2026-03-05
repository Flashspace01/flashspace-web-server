import { Request, Response } from "express";
import { InvoiceService } from "./invoice.service";
import { getInvoicesSchema, getInvoiceByIdSchema } from "./invoice.validation";

const sendError = (
  res: Response,
  status: number,
  message: string,
  error: any = null,
) => {
  return res.status(status).json({
    success: false,
    message,
    data: {},
    error:
      process.env.NODE_ENV === "development" ? error : "Internal Server Error",
  });
};

export const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const validation = getInvoicesSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error);
    }

    const userId = req.user?.id;
    const role = req.user?.role;
    const { status, fromDate, toDate, page, limit } = validation.data.query;

    const data = await InvoiceService.getInvoices(
      userId as string,
      role as string,
      { status, fromDate, toDate },
      page,
      limit,
    );

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    sendError(res, 500, "Failed to fetch invoices", error.message);
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const validation = getInvoiceByIdSchema.safeParse(req);
    if (!validation.success) {
      return sendError(res, 400, "Validation Error", validation.error);
    }

    const userId = req.user?.id;
    const role = req.user?.role;
    const { invoiceId } = validation.data.params;

    const invoice = await InvoiceService.getInvoiceById(
      userId as string,
      role as string,
      invoiceId,
    );

    res.status(200).json({ success: true, data: invoice });
  } catch (error: any) {
    const status = error.message.includes("unauthorized") ? 403 : 404;
    sendError(res, status, error.message, error.message);
  }
};
