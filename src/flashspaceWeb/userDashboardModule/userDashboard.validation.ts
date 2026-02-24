import { z } from "zod";

export const getCreditsSchema = z.object({
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

export const redeemRewardSchema = z.object({
  body: z.object({
    spaceId: z.string().optional(),
    spaceName: z.string().min(1, "Space name must not be empty").optional(),
    date: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .optional(), // ISO string or YYYY-MM-DD
    timeSlot: z.string().optional(),
  }),
});
