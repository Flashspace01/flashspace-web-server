import { Types } from "mongoose";
import { ApiResponse } from "../../authModule/types/auth.types";
import { InvoiceModel } from "../../userDashboardModule/models/invoice.model";

export type ListInvoicesParams = {
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
};

export type CreateInvoiceInput = {
  user: string;
  bookingNumber?: string;
  description: string;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  dueDate?: Date;
};

export class SpacePortalInvoicesService {
  async getInvoices(params: ListInvoicesParams): Promise<ApiResponse> {
    try {
      const { status, fromDate, toDate, page = 1, limit = 10 } = params;

      const query: any = { isDeleted: false };
      if (status) query.status = status;

      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = fromDate;
        if (toDate) query.createdAt.$lte = toDate;
      }

      const skip = (page - 1) * limit;

      const [invoices, total, totals] = await Promise.all([
        InvoiceModel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        InvoiceModel.countDocuments(query),
        InvoiceModel.aggregate([
          { $match: query },
          {
            $group: {
              _id: "$status",
              amount: { $sum: "$total" },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const totalPaid = totals.find((t) => t._id === "paid")?.amount || 0;
      const totalPending = totals.find((t) => t._id === "pending")?.amount || 0;

      return {
        success: true,
        message: "Invoices fetched successfully",
        data: {
          summary: {
            totalPaid,
            totalPending,
            totalInvoices: total,
          },
          invoices,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch invoices",
        error: error?.message,
      };
    }
  }

  async getInvoiceById(invoiceId: string): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(invoiceId)) {
        return {
          success: false,
          message: "Invalid invoice ID format",
        };
      }

      const invoice = await InvoiceModel.findOne({
        _id: invoiceId,
        isDeleted: false,
      });

      if (!invoice) {
        return {
          success: false,
          message: "Invoice not found",
        };
      }

      return {
        success: true,
        message: "Invoice fetched successfully",
        data: invoice,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch invoice",
        error: error?.message,
      };
    }
  }

  async createInvoice(payload: CreateInvoiceInput): Promise<ApiResponse> {
    try {
      const invoice = await InvoiceModel.create({
        ...payload,
      });

      return {
        success: true,
        message: "Invoice created successfully",
        data: invoice,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to create invoice",
        error: error?.message,
      };
    }
  }
}
