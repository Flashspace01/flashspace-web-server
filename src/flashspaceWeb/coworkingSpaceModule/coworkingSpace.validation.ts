import { z } from "zod";

const InventoryTypeEnum = z.enum(["PRIVATE_CABIN", "OPEN_DESK", "OTHER"]);

const InventoryItemSchema = z.object({
  type: InventoryTypeEnum,
  customName: z.string().optional(),
  totalUnits: z.number().int().nonnegative().default(0),
  pricePerMonth: z.number().nonnegative().optional(),
  pricePerYear: z.number().nonnegative().optional(),
  pricePerDay: z.number().nonnegative().optional(),
  pricePerHour: z.number().nonnegative().optional(),
}).refine((data) => {
  // If type is OTHER, customName is mandatory
  if (data.type === "OTHER" && (!data.customName || data.customName.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "customName is required when type is OTHER",
  path: ["customName"],
});

const OperatingHoursSchema = z.object({
  openTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format (HH:MM)"),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format (HH:MM)"),
  daysOpen: z.array(z.string()).min(1, "Must be open at least one day"),
});

const LocationSchema = z.object({
  type: z.literal("Point").default("Point"),
  coordinates: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]),
});

export const createCoworkingSpaceSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    address: z.string().min(5, "Address is required"),
    city: z.string().min(2, "City is required"),
    area: z.string().min(2, "Area is required"),
    inventory: z.array(InventoryItemSchema).optional(),
    operatingHours: OperatingHoursSchema.optional(),
    amenities: z.array(z.string()).optional(),
    capacity: z.number().int().positive("Capacity must be a positive integer"),
    sponsored: z.boolean().optional(),
    popular: z.boolean().optional(),
    location: LocationSchema.optional(),
    images: z.array(z.string()).min(1, "At least one image is required"),
  }),
});

export const updateCoworkingSpaceSchema = z.object({
  params: z.object({
    coworkingSpaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    address: z.string().min(5).optional(),
    city: z.string().min(2).optional(),
    area: z.string().min(2).optional(),
    inventory: z.array(InventoryItemSchema).optional(),
    operatingHours: OperatingHoursSchema.optional(),
    amenities: z.array(z.string()).optional(),
    capacity: z.number().int().positive().optional(),
    sponsored: z.boolean().optional(),
    location: LocationSchema.optional(),
    images: z.array(z.string()).min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});