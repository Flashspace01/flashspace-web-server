import { z } from "zod";

const SeatSchema = z.object({
  seatNumber: z.string(),
  isActive: z.boolean().default(true),
});

const TableInputSchema = z.object({
  tableNumber: z.string(),
  numberOfSeats: z.number().int().positive().optional(),
  seats: z.array(SeatSchema).optional(),
});

const FloorInputSchema = z.object({
  floorNumber: z.number().int(),
  name: z.string().optional(),
  tables: z.array(TableInputSchema),
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
    name: z.string().min(3, "Name must be at least 3 characters"),
    address: z.string().min(5, "Address is required"),
    city: z.string().min(2, "City is required"),
    area: z.string().min(2, "Area is required"),
    pricePerMonth: z.number().nonnegative().optional(),
    pricePerDay: z.number().nonnegative().optional(),
    floors: z.array(FloorInputSchema).optional(),
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
    coworkingSpaceId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    address: z.string().min(5).optional(),
    city: z.string().min(2).optional(),
    area: z.string().min(2).optional(),
    pricePerMonth: z.number().nonnegative().optional(),
    pricePerDay: z.number().nonnegative().optional(),
    floors: z.array(FloorInputSchema).optional(),
    operatingHours: OperatingHoursSchema.optional(),
    amenities: z.array(z.string()).optional(),
    capacity: z.number().int().positive().optional(),
    sponsored: z.boolean().optional(),
    location: LocationSchema.optional(),
    images: z.array(z.string()).min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});
