import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { UserModel } from "../flashspaceWeb/authModule/models/user.model";
import { BookingModel } from "../flashspaceWeb/bookingModule/booking.model";

async function fetchPair() {
  console.log("Script started...");
  try {
    console.log(
      "Connecting to:",
      process.env.DB_URI || "mongodb://localhost:27018/myapp",
    );
    await mongoose.connect(
      process.env.DB_URI || "mongodb://localhost:27018/myapp",
      {
        serverSelectionTimeoutMS: 5000,
      },
    );
    console.log("Connected successfully.");

    console.log("Fetching a booking...");
    const booking = await BookingModel.findOne().lean();
    if (!booking) {
      console.log("No bookings found.");
      process.exit(0);
    }
    console.log("Found booking:", booking._id);

    console.log("Fetching client...");
    const client = await UserModel.findById(booking.user).lean();
    console.log("Fetching partner...");
    const partner = await UserModel.findById(booking.partner).lean();

    console.log("\n--- FOUND RELATED PAIR ---");
    console.log("BOOKING ID:", booking._id);
    console.log("BOOKING NUMBER:", (booking as any).bookingNumber);
    console.log("");
    console.log("CLIENT (User):");
    console.log("  Name: ", client?.fullName);
    console.log("  Email:", client?.email);
    console.log("  Password: Password123!");
    console.log("  Role: ", client?.role);
    console.log("");
    console.log("PARTNER:");
    console.log("  Name: ", partner?.fullName);
    console.log("  Email:", partner?.email);
    console.log("  Password: Password123!");
    console.log("  Role: ", partner?.role);

    process.exit(0);
  } catch (err) {
    console.error("ERROR observed:", err);
    process.exit(1);
  }
}

fetchPair();
