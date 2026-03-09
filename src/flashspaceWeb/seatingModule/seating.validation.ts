import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId",
  });

export const getAvailabilitySchema = z.object({
  params: z.object({
    spaceId: objectIdSchema,
  }),
  query: z.object({
    start: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
    end: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
  }),
});

export const createHoldSchema = z.object({
  body: z.object({
    spaceId: objectIdSchema,
    seatIds: z.array(objectIdSchema).min(1, "At least one seat is required"),
    startTime: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
    endTime: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
  }),
});

export const confirmBookingSchema = z.object({
  params: z.object({
    bookingId: objectIdSchema,
  }),
  body: z.object({
    paymentId: z.string().min(1, "Payment ID is required"),
  }),
});

export const cancelBookingSchema = z.object({
  params: z.object({
    bookingId: objectIdSchema,
  }),
});

export const getUserBookingsSchema = z.object({
  query: z.object({
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

export const getBookingByIdSchema = z.object({
  params: z.object({
    bookingId: objectIdSchema,
  }),
});
