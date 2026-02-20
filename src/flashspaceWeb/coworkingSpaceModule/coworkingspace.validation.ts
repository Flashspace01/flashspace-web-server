import { z } from "zod";

const InventoryItemSchema = z.object({
  type: z.string().min(1, "Inventory type is required"),
  totalUnits: z.number().int().nonnegative().default(0),
  pricePerMonth: z.number().nonnegative().default(0),
});

export const createCoworkingSpaceSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    address: z.string().min(5, "Address is required"),
    city: z.string().min(2, "City is required"),
    area: z.string().min(2, "Area is required"),
    inventory: z.array(InventoryItemSchema).optional(),
    amenities: z.array(z.string()).optional(),
    capacity: z.number().int().positive("Capacity must be a positive integer"),
    sponsored: z.boolean().optional(),
    popular: z.boolean().optional(),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    images: z.array(z.string()).min(1, "At least one image is required"),
  }),
});

export const updateCoworkingSpaceSchema = z.object({
  params: z.object({
    coworkingSpaceId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    address: z.string().min(5).optional(),
    city: z.string().min(2).optional(),
    area: z.string().min(2).optional(),
    inventory: z.array(InventoryItemSchema).optional(),
    amenities: z.array(z.string()).optional(),
    capacity: z.number().int().positive().optional(),
    sponsored: z.boolean().optional(),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    images: z.array(z.string()).min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});
