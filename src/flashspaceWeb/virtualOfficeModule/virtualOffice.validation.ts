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
    name: z
      .string()
      .min(3, "Name must be at least 3 characters long")
      .optional(),
    address: z
      .string()
      .min(5, "Address must be at least 5 characters long")
      .optional(),
    city: z
      .string()
      .min(2, "City must be at least 2 characters long")
      .optional(),
    area: z
      .string()
      .min(2, "Area must be at least 2 characters long")
      .optional(),
    propertyId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Property ID")
      .optional(),

    // FIXED: Updated to Numbers and matching the Model property names
    finalGstPricePerYear: z.number().nonnegative(),
    finalMailingPricePerYear: z.number().nonnegative(),
    finalBrPricePerYear: z.number().nonnegative(),

    features: z.array(z.string()).min(1, "At least one feature is required"),
    amenities: z.array(z.string()).min(1, "At least one amenity is required"),
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
    amenities: z.array(z.string()).optional(),
    popular: z.boolean().optional(),
    sponsored: z.boolean().optional(),
    location: LocationSchema.optional(), // FIXED: Replaced coordinates
    images: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
  }),
});

const objectIdSchema = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ObjectId",
  });

export const getVirtualOfficesSchema = z.object({
  query: z.object({
    deleted: z.enum(["true", "false"]).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((val) => !val || val <= 100, {
        message: "Limit cannot exceed 100",
      })
      .optional(),
    property: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Property ID")
      .optional(),
  }),
});

export const getVirtualOfficeByIdSchema = z.object({
  params: z.object({
    virtualOfficeId: objectIdSchema,
  }),
});

export const getVirtualOfficesByCitySchema = z.object({
  params: z.object({
    city: z.string().min(2),
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

export const getPartnerVirtualOfficesSchema = z.object({
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
