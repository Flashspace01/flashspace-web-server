import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId",
  });

// ADDED: Missing schema to protect pagination math
export const getAllBookingsSchema = z.object({
  query: z.object({
    type: z.string().optional(),
    status: z.string().optional(),
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

export const toggleAutoRenewSchema = z.object({
  params: z.object({
    bookingId: objectIdSchema,
  }),
  body: z.object({
    autoRenew: z.boolean(),
  }),
});

export const linkProfileSchema = z.object({
  params: z.object({
    bookingId: objectIdSchema,
  }),
  body: z.object({
    profileId: objectIdSchema,
  }),
});

export const getPartnerBookingsSchema = z.object({
  params: z.object({
    spaceId: objectIdSchema,
  }),
  query: z.object({
    month: z.string().regex(/^\d+$/).optional(),
    year: z.string().regex(/^\d+$/).optional(),
  }),
});

export const getBookingByIdSchema = z.object({
  params: z.object({
    bookingId: objectIdSchema,
  }),
});

export const getBookingsByPropertySchema = z.object({
  params: z.object({
    spaceId: objectIdSchema,
  }),
  query: z.object({
    month: z.string().regex(/^\d+$/).optional(),
    year: z.string().regex(/^\d+$/).optional(),
  }),
});
