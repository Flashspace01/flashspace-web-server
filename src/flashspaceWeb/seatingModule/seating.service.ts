import { Types, startSession } from "mongoose";
import { SeatBookingModel } from "./seating.model";
import { CoworkingSpaceModel } from "../coworkingSpaceModule/coworkingSpace.model";
import { UserRole } from "../authModule/models/user.model";

export class BookingService {
  /**
   * Returns the full layout for a given space, with a boolean `available` on each seat.
   * Availability is determined by checking for any existing confirmed or non-expired pending bookings
   * that overlap the requested time and include the seat.
   */
  static async getAvailability(
    spaceId: string,
    startTime: Date,
    endTime: Date,
  ) {
    if (!Types.ObjectId.isValid(spaceId)) {
      throw new Error("Invalid space ID format");
    }

    const space = await CoworkingSpaceModel.findOne({
      _id: spaceId,
      isDeleted: false,
    });
    if (!space) {
      throw new Error("Space not found");
    }

    if (!space.floors || space.floors.length === 0) {
      return { floors: [] };
    }

    // Find overlapping reservations that are blocking availability
    const overlappingBookings = await SeatBookingModel.find({
      space: spaceId,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
      status: { $in: ["confirmed", "pending"] },
    });

    const bookedSeatIds = new Set<string>();
    for (const booking of overlappingBookings) {
      // For pending bookings, check if the hold expired
      if (
        booking.status === "pending" &&
        booking.holdExpiresAt &&
        new Date() > booking.holdExpiresAt
      ) {
        continue; // The hold has expired, seat is free
      }
      for (const seatId of booking.seatIds) {
        bookedSeatIds.add(seatId.toString());
      }
    }

    // Map through the space's floors and mark seats
    const layout = space.floors.map((floor) => ({
      floorNumber: floor.floorNumber,
      name: floor.name,
      tables: floor.tables.map((table) => ({
        tableNumber: table.tableNumber,
        seats: table.seats
          .filter((seat) => seat.isActive) // Filter inactive (soft-deleted) seats
          .map((seat: any) => ({
            _id: seat._id,
            seatNumber: seat.seatNumber,
            available: !bookedSeatIds.has(seat._id.toString()),
          })),
      })),
    }));

    return { floors: layout };
  }

  /**
   * Creates a atomic hold on exactly these seats.
   */
  static async createHold(
    userId: string,
    spaceId: string,
    seatIds: string[],
    startTime: Date,
    endTime: Date,
  ) {
    try {
      if (!Types.ObjectId.isValid(spaceId)) {
        throw new Error("Invalid space ID format");
      }

      const space = await CoworkingSpaceModel.findOne({
        _id: spaceId,
        isDeleted: false,
      });
      if (!space) {
        throw new Error("Space not found");
      }

      // Check if seats exist in the space
      const spaceSeatIds = new Set<string>(); // seatId
      if (space.floors) {
        for (const floor of space.floors) {
          for (const table of floor.tables) {
            for (const seat of table.seats) {
              if (seat.isActive) {
                spaceSeatIds.add((seat as any)._id.toString());
              }
            }
          }
        }
      }

      for (const id of seatIds) {
        if (!spaceSeatIds.has(id)) {
          throw new Error(`Seat ${id} not found in this space or inactive.`);
        }
      }

      // Check overlapping holds
      const overlappingBookings = await SeatBookingModel.find({
        space: spaceId,
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
        status: { $in: ["confirmed", "pending"] },
        seatIds: { $in: seatIds },
      });

      const conflicts = overlappingBookings.filter(
        (b) =>
          b.status === "confirmed" ||
          (b.status === "pending" &&
            b.holdExpiresAt &&
            new Date() <= b.holdExpiresAt),
      );

      if (conflicts.length > 0) {
        throw new Error(
          "One or more selected seats are already booked or held for this time period.",
        );
      }

      // Calculate the duration
      const diffMs = endTime.getTime() - startTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Simple hourly rate calculation from pricePerDay
      const pricePerDay = (space as any).pricePerDay || 500;
      const hourlyRate = pricePerDay / 8; // Assuming 8 hour work day

      let totalAmount = 0;
      for (const id of seatIds) {
        totalAmount += hourlyRate * diffHours;
      }

      const holdExpiresAt = new Date();
      holdExpiresAt.setMinutes(holdExpiresAt.getMinutes() + 10);

      const [newHold] = await SeatBookingModel.create([
        {
          space: spaceId,
          user: userId,
          startTime,
          endTime,
          seatIds,
          totalAmount,
          status: "pending",
          holdExpiresAt,
        },
      ]);

      return newHold;
    } catch (err) {
      throw err;
    }
  }

  static async confirmBooking(
    bookingId: string,
    userId: string,
    paymentId: string,
  ) {
    try {
      const booking = await SeatBookingModel.findOne({
        _id: bookingId,
        user: userId,
      });
      if (!booking) {
        throw new Error("Booking not found or unauthorized");
      }

      // If already confirmed, just return it
      if (booking.status === "confirmed") {
        return booking;
      }

      // Allow confirmation for 'pending' or 'expired' (if within grace period)
      if (booking.status !== "pending" && booking.status !== "expired") {
        throw new Error(
          `Booking cannot be confirmed from status: ${booking.status}`,
        );
      }

      // Implement a 5-minute grace period
      const gracePeriodMs = 5 * 60 * 1000;
      const now = new Date();

      if (booking.holdExpiresAt) {
        const expiryWithGrace = new Date(
          booking.holdExpiresAt.getTime() + gracePeriodMs,
        );

        if (now > expiryWithGrace) {
          throw new Error("Booking hold expired beyond grace period");
        }
      }

      booking.status = "confirmed";
      booking.paymentId = paymentId;
      booking.holdExpiresAt = undefined;

      await booking.save();

      return booking;
    } catch (err) {
      throw err;
    }
  }

  static async cancelBooking(
    bookingId: string,
    userId: string,
    userRole?: string,
  ) {
    const query: any = { _id: bookingId };
    if (userRole !== UserRole.ADMIN) {
      query.user = userId;
    }

    const booking = await SeatBookingModel.findOneAndUpdate(
      query,
      { status: "cancelled" },
      { new: true },
    );

    if (!booking) {
      throw new Error("Booking not found or unauthorized");
    }

    return booking;
  }

  static async getUserBookings(userId: string, limit: number, page: number) {
    const bookings = await SeatBookingModel.find({ user: userId })
      .populate("space")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await SeatBookingModel.countDocuments({ user: userId });

    return {
      bookings,
      total,
      limit,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getBookingById(bookingId: string) {
    return await SeatBookingModel.findById(bookingId).populate("space");
  }

  static async expireOldHolds() {
    const now = new Date();
    await SeatBookingModel.updateMany(
      { status: "pending", holdExpiresAt: { $lt: now } },
      { $set: { status: "expired" } },
    );
  }
}
