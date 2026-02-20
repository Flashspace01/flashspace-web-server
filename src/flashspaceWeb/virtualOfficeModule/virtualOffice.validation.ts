import { z } from "zod";

export const createVirtualOfficeSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Name must be at least 3 characters long"),
    address: z.string().min(5, "Address must be at least 5 characters long"),
    city: z.string().min(2, "City must be at least 2 characters long"),
    area: z.string().min(2, "Area must be at least 2 characters long"),
    gstPlanPrice: z.string().optional(),
    mailingPlanPrice: z.string().optional(),
    brPlanPrice: z.string().optional(),
    features: z.array(z.string()).min(1, "At least one feature is required"),
    availability: z.string().default("Available Now"),
    popular: z.boolean().optional(),
    sponsored: z.boolean().optional(),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    images: z.array(z.string()).min(1, "At least one image is required"),
  }),
});

export const updateVirtualOfficeSchema = z.object({
  params: z.object({
    virtualOfficeId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    address: z.string().min(5).optional(),
    city: z.string().min(2).optional(),
    area: z.string().min(2).optional(),
    gstPlanPrice: z.string().optional(),
    mailingPlanPrice: z.string().optional(),
    brPlanPrice: z.string().optional(),
    features: z.array(z.string()).optional(),
    availability: z.string().optional(),
    popular: z.boolean().optional(),
    sponsored: z.boolean().optional(),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    images: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
  }),
});
