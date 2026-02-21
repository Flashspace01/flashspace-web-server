import { z } from "zod";
import { EventSpaceType } from "./eventSpace.model";

const eventSpaceTypeEnum = z.nativeEnum(EventSpaceType);

// Matches our new Typegoose GeoLocation schema
const LocationSchema = z.object({
  type: z.literal("Point").default("Point"),
  coordinates: z.tuple([
    z.number().min(-180).max(180), // Longitude
    z.number().min(-90).max(90),   // Latitude
  ]),
});

// --- ADDED: Operating Hours Validation ---
const OperatingHoursSchema = z.object({
  openTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format (HH:MM)"),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format (HH:MM)"),
  daysOpen: z.array(z.string()).min(1, "Must be open at least one day"),
});
// -----------------------------------------

export const createEventSpaceSchema = z.object({
  body: z
    .object({
      name: z.string().min(3, "Name must be at least 3 characters long"),
      address: z.string().min(5, "Address must be at least 5 characters long"),
      city: z.string().min(2, "City must be at least 2 characters long"),
      area: z.string().min(2, "Area must be at least 2 characters long"),
      pricePerHour: z.number().positive("Price must be a positive number"),
      pricePerDay: z.number().positive("Day price must be positive").optional(), // Added
      // --- ADDED FIELDS ---
      operatingHours: OperatingHoursSchema.optional(),
      minBookingHours: z.number().int().positive().optional(),
      // --------------------
      type: eventSpaceTypeEnum,
      customType: z.string().optional(),
      location: LocationSchema.optional(), // FIXED: Replaced coordinates
      amenities: z.array(z.string()).optional(),
      capacity: z.number().int().positive().optional(),
      sponsored: z.boolean().optional(),
      popular: z.boolean().optional(),
      images: z
        .array(z.string())
        .min(1, "At least one image is required")
        .max(10, "Maximum 10 images allowed"),
    })
    .refine(
      (data) => {
        if (data.type === EventSpaceType.OTHER && (!data.customType || data.customType.trim() === "")) {
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
      pricePerHour: z.number().positive().optional(),
      pricePerDay: z.number().positive().optional(), // Added
      type: eventSpaceTypeEnum.optional(),
      customType: z.string().optional(),
      location: LocationSchema.optional(), // FIXED: Replaced coordinates
      amenities: z.array(z.string()).optional(),
      capacity: z.number().int().positive().optional(),
      sponsored: z.boolean().optional(),
      popular: z.boolean().optional(),
      images: z.array(z.string()).max(10).optional(),
      isActive: z.boolean().optional(),
      isDeleted: z.boolean().optional(),
      // --- ADDED FIELDS ---
      operatingHours: OperatingHoursSchema.optional(),
      minBookingHours: z.number().int().positive().optional(),
      // --------------------
    })
    .refine(
      (data) => {
        // Only validate customType if type is explicitly being updated to OTHER
        if (data.type === EventSpaceType.OTHER && (!data.customType || data.customType.trim() === "")) {
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