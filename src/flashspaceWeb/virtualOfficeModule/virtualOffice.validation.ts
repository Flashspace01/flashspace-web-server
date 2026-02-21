import { z } from "zod";

// Matches our new Typegoose GeoLocation schema
const LocationSchema = z.object({
  type: z.literal("Point").default("Point"),
  coordinates: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]),
});

export const createVirtualOfficeSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Name must be at least 3 characters long"),
    address: z.string().min(5, "Address must be at least 5 characters long"),
    city: z.string().min(2, "City must be at least 2 characters long"),
    area: z.string().min(2, "Area must be at least 2 characters long"),
    
    // FIXED: Updated to Numbers and matching the Model property names
    gstPlanPricePerYear: z.number().nonnegative().optional(),
    mailingPlanPricePerYear: z.number().nonnegative().optional(),
    brPlanPricePerYear: z.number().nonnegative().optional(),
    
    features: z.array(z.string()).min(1, "At least one feature is required"),
    availability: z.string().default("Available Now"),
    popular: z.boolean().optional(),
    sponsored: z.boolean().optional(),
    location: LocationSchema.optional(), // FIXED: Replaced coordinates
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
    
    // FIXED: Updated to Numbers
    gstPlanPricePerYear: z.number().nonnegative().optional(),
    mailingPlanPricePerYear: z.number().nonnegative().optional(),
    brPlanPricePerYear: z.number().nonnegative().optional(),
    
    features: z.array(z.string()).optional(),
    availability: z.string().optional(),
    popular: z.boolean().optional(),
    sponsored: z.boolean().optional(),
    location: LocationSchema.optional(), // FIXED: Replaced coordinates
    images: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
  }),
});