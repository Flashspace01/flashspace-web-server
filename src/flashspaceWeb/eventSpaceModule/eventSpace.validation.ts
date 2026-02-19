import { z } from "zod";
import { EventSpaceType } from "./eventSpace.model";

const eventSpaceTypeEnum = z.nativeEnum(EventSpaceType);

export const createEventSpaceSchema = z.object({
  body: z
    .object({
      name: z.string().min(3, "Name must be at least 3 characters long"),
      address: z.string().min(5, "Address must be at least 5 characters long"),
      city: z.string().min(2, "City must be at least 2 characters long"),
      area: z.string().min(2, "Area must be at least 2 characters long"),
      price: z.number().positive("Price must be a positive number"),
      type: eventSpaceTypeEnum,
      customType: z.string().optional(),
      coordinates: z
        .object({
          lat: z.number(),
          lng: z.number(),
        })
        .optional(),
      amenities: z.array(z.string()).optional(),
      capacity: z.number().int().positive().optional(),
      images: z
        .array(z.string())
        .min(1, "At least one image is required")
        .max(10, "Maximum 10 images allowed"),
    })
    .refine(
      (data) => {
        if (data.type === EventSpaceType.OTHER && !data.customType) {
          return false;
        }
        return true;
      },
      {
        message: "Custom type is required when type is 'other'",
        path: ["customType"],
      },
    ),
});

export const updateEventSpaceSchema = z.object({
  params: z.object({
    eventSpaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
  }),
  body: z
    .object({
      name: z.string().min(3).optional(),
      address: z.string().min(5).optional(),
      city: z.string().min(2).optional(),
      area: z.string().min(2).optional(),
      price: z.number().positive().optional(),
      type: eventSpaceTypeEnum.optional(),
      customType: z.string().optional(),
      coordinates: z
        .object({
          lat: z.number(),
          lng: z.number(),
        })
        .optional(),
      amenities: z.array(z.string()).optional(),
      capacity: z.number().int().positive().optional(),
      images: z.array(z.string()).max(10).optional(),
      isActive: z.boolean().optional(),
      isDeleted: z.boolean().optional(),
    })
    .refine(
      (data) => {
        if (data.type === EventSpaceType.OTHER && !data.customType) {
          return false;
        }
        return true;
      },
      {
        message: "Custom type is required when type is 'other'",
        path: ["customType"],
      },
    ),
});
