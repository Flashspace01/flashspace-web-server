import { z } from "zod";

const SeatSchema = z.object({
  seatNumber: z.string(),
  isActive: z.boolean().default(true),
});

const TableInputSchema = z.object({
  tableNumber: z.string(),
  numberOfSeats: z.number().int().positive("Seating capacity is required"),
  seats: z.array(SeatSchema).optional(),
});

const FloorInputSchema = z.object({
  floorNumber: z.number().int(),
  name: z.string().optional(),
  tables: z.array(TableInputSchema).min(1, "At least one table is required"),
});

const OperatingHoursSchema = z.object({
  openTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format (HH:MM)"),
  closeTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format (HH:MM)"),
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
    spaceId: z.string().trim().min(1).optional(),
    name: z.string().min(3, "Name must be at least 3 characters").optional(),
    address: z.string().min(5, "Address is required").optional(),
    city: z.string().min(2, "City is required").optional(),
    area: z.string().min(2, "Area is required").optional(),
    propertyId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Property ID")
      .optional(),
    partnerPricePerMonth: z.number().nonnegative().optional(),
    adminMarkupPerMonth: z.number().nonnegative().optional(),
    finalPricePerMonth: z.number().nonnegative().optional(),
    pricePerDay: z.number().nonnegative().optional(),
    floors: z.array(FloorInputSchema).min(1, "At least one floor is required"),
    operatingHours: OperatingHoursSchema.optional(),
    amenities: z.array(z.string()).optional(),
    capacity: z.number().int().positive("Capacity must be a positive integer"),
    sponsored: z.boolean().optional(),
    popular: z.boolean().optional(),
    location: LocationSchema.optional(),
    images: z.array(z.string()).optional(),
  }),
});

export const updateCoworkingSpaceSchema = z.object({
  params: z.object({
    coworkingSpaceId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
  }),
  body: z.object({
    spaceId: z.string().trim().min(1).optional(),
    name: z.string().min(3).optional(),
    address: z.string().min(5).optional(),
    city: z.string().min(2).optional(),
    area: z.string().min(2).optional(),
    partnerPricePerMonth: z.number().nonnegative().optional(),
    adminMarkupPerMonth: z.number().nonnegative().optional(),
    finalPricePerMonth: z.number().nonnegative().optional(),
    pricePerDay: z.number().nonnegative().optional(),
    floors: z.array(FloorInputSchema).optional(),
    operatingHours: OperatingHoursSchema.optional(),
    amenities: z.array(z.string()).optional(),
    capacity: z.number().int().positive().optional(),
    sponsored: z.boolean().optional(),
    location: LocationSchema.optional(),
    images: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    approvalStatus: z.string().optional(),
    partner: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Partner ID").optional(),
    partnerId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Partner ID").optional(),
  }),
});

export const getCoworkingSpacesSchema = z.object({
  query: z.object({
    deleted: z.enum(["true", "false"]).optional(),
    property: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Property ID")
      .optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((val) => !val || val <= 100, {
        message: "Limit cannot exceed 100",
      })
      .optional(),
    city: z.string().optional(),
    name: z.string().optional(),
    area: z.string().optional(),
  }),
});
