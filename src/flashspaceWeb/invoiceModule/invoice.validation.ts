import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId",
  });

export const getInvoicesSchema = z.object({
  query: z.object({
    status: z.enum(["paid", "pending", "overdue", "cancelled"]).optional(),
    fromDate: z
      .string()
      .datetime()
      .optional()
      .or(
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      ),
    toDate: z
      .string()
      .datetime()
      .optional()
      .or(
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      ),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((val) => !val || val <= 100, {
        message: "Limit cannot exceed 100",
      })
      .optional(),
  }),
});

export const getInvoiceByIdSchema = z.object({
  params: z.object({
    invoiceId: objectIdSchema,
  }),
});
