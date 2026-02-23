import { BookingService } from "./booking.service";

/**
 * Periodically cleans up expired holds by running a background check.
 * This should be called once when the server starts.
 */
export const startBookingCleanupJob = () => {
  // Run every minute (60000 ms)
  setInterval(async () => {
    try {
      await BookingService.expireOldHolds();
    } catch (error) {
      console.error("Failed to execute booking cleanup job:", error);
    }
  }, 60 * 1000);
  console.log("Background job: Booking holds cleanup initialized.");
};
