import { z } from "zod";

export const createMeetingRoomSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Name must be at least 3 characters long"),
    address: z.string().min(5, "Address must be at least 5 characters long"),
    city: z.string().min(2, "City must be at least 2 characters long"),
    area: z.string().min(2, "Area must be at least 2 characters long"),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    price: z.number().int().positive("Price must be a positive integer"),
    capacity: z.number().int().positive("Capacity must be a positive integer"),
    type: z.enum(["meeting_room", "board_room", "conference_room"]),
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
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    price: z.number().int().positive().optional(),
    capacity: z.number().int().positive().optional(),
    type: z.enum(["meeting_room", "board_room", "conference_room"]).optional(),
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string()).max(10).optional(),
    sponsored: z.boolean().optional(),
    popular: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
  }),
});
