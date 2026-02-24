import { z } from "zod";

export const createReviewSchema = z.object({
  body: z.object({
    spaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Space ID format"),
    spaceModel: z.enum([
      "CoworkingSpace",
      "VirtualOffice",
      "MeetingRoom",
      "EventSpace",
    ]),
    rating: z.number().min(1).max(5),
    comment: z
      .string()
      .min(2, "Comment must be at least 2 characters")
      .max(500),
    reviewImages: z.array(z.string()).optional(),
    npsScore: z.number().min(0).max(10).optional(),
  }),
});

export const getReviewsSchema = z.object({
  params: z.object({
    spaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Space ID format"),
  }),
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
