import "dotenv/config";
import mongoose from "mongoose";
import { BookingModel } from "../flashspaceWeb/userDashboardModule/models/booking.model";

/**
 * MIGRATION SCRIPT
 * Run this to fix existing bookings that are missing the partnerId field.
 * Usage: npx ts-node src/scripts/migrateBookings.ts <partnerUserId>
 */

const migrate = async () => {
  try {
    const partnerId = process.argv[2];
    if (!partnerId) {
      console.error(
        "Please provide a partner user ID to assign to the bookings.",
      );
      console.log(
        "Usage: npx ts-node src/scripts/migrateBookings.ts 6989ccdefc41b1c899d3cd33",
      );
      process.exit(1);
    }

    const dbUri = process.env.DB_URI || "mongodb://localhost:27017/myapp";
    console.log(`Connecting to ${dbUri}...`);
    await mongoose.connect(dbUri);

    const result = await BookingModel.updateMany(
      { partnerId: { $exists: false } },
      { $set: { partnerId: new mongoose.Types.ObjectId(partnerId) } },
    );

    console.log(
      `✅ Successfully updated ${result.modifiedCount} bookings with partnerId: ${partnerId}`,
    );
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrate();
