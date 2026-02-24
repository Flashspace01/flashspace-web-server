import { z } from "zod";
import { MeetingRoomType } from "./meetingRoom.model";

const meetingRoomTypeEnum = z.nativeEnum(MeetingRoomType); // FIXED: Uses the actual enum

const LocationSchema = z.object({
  type: z.literal("Point").default("Point"),
  coordinates: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]),
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

export const createMeetingRoomSchema = z.object({
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
    location: LocationSchema.optional(), // FIXED
    partnerPricePerHour: z
      .number()
      .int()
      .positive("Price must be a positive integer"),
    partnerPricePerDay: z.number().positive(),
    operatingHours: OperatingHoursSchema,
    minBookingHours: z.number().int().positive().optional(),
    capacity: z.number().int().positive("Capacity must be a positive integer"),
    type: meetingRoomTypeEnum,
    amenities: z.array(z.string()).min(1, "At least one amenity is required"),
    images: z
      .array(z.string())
      .min(1, "At least one image is required")
      .max(10, "Maximum 10 images allowed"),
    sponsored: z.boolean().optional(),
    popular: z.boolean().optional(),
  }),
});

export const updateMeetingRoomSchema = z.object({
  params: z.object({
    meetingRoomId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    address: z.string().min(5).optional(),
    city: z.string().min(2).optional(),
    area: z.string().min(2).optional(),
    location: LocationSchema.optional(), // FIXED
    partnerPricePerHour: z.number().int().positive().optional(),
    partnerPricePerDay: z.number().positive().optional(),
    pricePerHour: z.number().int().positive().optional(),
    pricePerDay: z.number().positive().optional(), // ADDED
    operatingHours: OperatingHoursSchema.optional(), // ADDED
    minBookingHours: z.number().int().positive().optional(), // ADDED
    capacity: z.number().int().positive().optional(),
    type: meetingRoomTypeEnum.optional(), // FIXED
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string()).max(10).optional(),
    sponsored: z.boolean().optional(),
    popular: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
  }),
});

export const getMeetingRoomsSchema = z.object({
  query: z.object({
    deleted: z.enum(["true", "false"]).optional(),
    type: meetingRoomTypeEnum.optional(),
    minPrice: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .transform(Number)
      .optional(),
    maxPrice: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .transform(Number)
      .optional(),
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

export const getMeetingRoomByIdSchema = z.object({
  params: z.object({
    meetingRoomId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
  }),
});

export const getMeetingRoomsByCitySchema = z.object({
  params: z.object({
    city: z.string().min(2, "City must be at least 2 characters"),
  }),
  query: z.object({
    type: meetingRoomTypeEnum.optional(),
    minPrice: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .transform(Number)
      .optional(),
    maxPrice: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .transform(Number)
      .optional(),
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
