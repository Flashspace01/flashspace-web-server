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
  openTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format (HH:MM)"),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format (HH:MM)"),
  daysOpen: z.array(z.string()).min(1, "Must be open at least one day"),
});

export const createMeetingRoomSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Name must be at least 3 characters long"),
    address: z.string().min(5, "Address must be at least 5 characters long"),
    city: z.string().min(2, "City must be at least 2 characters long"),
    area: z.string().min(2, "Area must be at least 2 characters long"),
    location: LocationSchema.optional(), // FIXED
    pricePerHour: z.number().int().positive("Price must be a positive integer"),
    pricePerDay: z.number().positive().optional(), // ADDED
    operatingHours: OperatingHoursSchema.optional(), // ADDED
    minBookingHours: z.number().int().positive().optional(), // ADDED
    capacity: z.number().int().positive("Capacity must be a positive integer"),
    type: meetingRoomTypeEnum, // FIXED
    amenities: z.array(z.string()).optional(),
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