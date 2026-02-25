import mongoose from "mongoose";
import * as dotenv from "dotenv";
dotenv.config();

// Since there's no model exported directly easily from outside without full ts-node setup,
// I'll just connect and query raw.
mongoose.connect("mongodb://localhost:27020/karyalink").then(async () => {
    console.log("Connected to DB");
    const bookings = await mongoose.connection.collection("bookings").find({}).toArray();
    console.log("Total Bookings:", bookings.length);
    console.log("Sample Booking ID:", bookings[0]?._id);

    const invoices = await mongoose.connection.collection("invoices").find({}).toArray();
    console.log("Total Invoices:", invoices.length);
    if (invoices.length > 0) {
        console.log("Sample Invoice bookingId:", invoices[0].bookingId);
    }

    process.exit(0);
}).catch(console.error);
