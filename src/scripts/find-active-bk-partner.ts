import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { UserModel } from "../flashspaceWeb/authModule/models/user.model";
import { BookingModel } from "../flashspaceWeb/userDashboardModule/models/booking.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function findActiveUserAndPartner() {
  try {
    const dbUri = process.env.DB_URI;
    if (!dbUri) {
      console.error("DB_URI not found");
      return;
    }

    await mongoose.connect(dbUri);
    console.log("Connected to Database");

    // Find an active booking for a virtual office (PascalCase)
    const booking = await BookingModel.findOne({
      type: "VirtualOffice",
      status: "active",
    }).populate("user");

    if (booking) {
      console.log(
        `Found active VirtualOffice booking: ${booking.bookingNumber}`,
      );
      await processBooking(booking);
    } else {
      console.log(
        "No active VirtualOffice booking found. Checking for any VirtualOffice booking...",
      );
      const genericBooking = await BookingModel.findOne({
        type: "VirtualOffice",
      }).populate("user");
      if (genericBooking) {
        console.log(
          `Found VirtualOffice booking: ${genericBooking.bookingNumber} (${genericBooking.status})`,
        );
        await processBooking(genericBooking);
      } else {
        console.log("No VirtualOffice bookings found at all.");
      }
    }

    async function processBooking(booking: any) {
      const user = booking.user as any;
      console.log(`\nUser: ${user.fullName} (${user.email}) id: ${user._id}`);
      console.log(`Booking Status: ${booking.status}`);

      const space = await VirtualOfficeModel.findById(booking.spaceId).populate(
        "partner",
      );
      if (space) {
        console.log(`Space Found: ${space._id}`);
        console.log(`Space Name: ${space.name}`);
        console.log(`Space object: ${JSON.stringify(space, null, 2)}`);
        const partner = space.partner as any;
        if (partner) {
          console.log(
            `Partner: ${partner.fullName} (${partner.email}) id: ${partner._id}`,
          );
        } else {
          console.log("No partner assigned to this space.");
        }
      } else {
        console.log(
          `Space ID ${booking.spaceId} not found in VirtualOfficeModel.`,
        );
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

findActiveUserAndPartner();
