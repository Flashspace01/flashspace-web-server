
// Script to find a booking ID
import mongoose from "mongoose";
import dotenv from "dotenv";
import { BookingModel } from "../flashspaceWeb/userDashboardModule/models/booking.model";

dotenv.config();

async function findBooking() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.DB_URI as string);
        console.log("Connected to database successfully!");

        const booking = await BookingModel.findOne({});

        if (booking) {
            console.log(`FOUND_BOOKING_ID: ${booking._id}`);
        } else {
            console.log("NO_BOOKINGS_FOUND");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error finding booking:", error);
        process.exit(1);
    }
}

findBooking();
