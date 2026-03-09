import mongoose from "mongoose";
import { BookingModel } from "./src/flashspaceWeb/bookingModule/booking.model";
import { UserModel } from "./src/flashspaceWeb/authModule/models/user.model";

async function debug() {
  await mongoose.connect("mongodb://localhost:27017/myapp");
  console.log("Connected to MongoDB database 'myapp'");

  // 1. Get all users with PARTNER role
  const partners = await UserModel.find(
    { role: "partner" },
    "_id fullName email",
  );
  console.log(`Found ${partners.length} partners:`);

  for (const p of partners) {
    const count = await BookingModel.countDocuments({
      partner: p._id,
      isDeleted: false,
    });
    console.log(
      `- ${p.fullName} (${p.email}) ID: ${p._id} -> Bookings: ${count}`,
    );
  }

  // 2. See which partners have bookings but might NOT have the role
  const distinctPartnerIdsInBookings = await BookingModel.distinct("partner");
  console.log(
    "\nPartners found in Bookings (regardless of role):",
    distinctPartnerIdsInBookings.length,
  );

  for (const id of distinctPartnerIdsInBookings) {
    const user = await UserModel.findById(id);
    const count = await BookingModel.countDocuments({
      partner: id,
      isDeleted: false,
    });
    if (user) {
      console.log(
        `- ${user.fullName} (${user.email}) Role: ${user.role} ID: ${id} -> Bookings: ${count}`,
      );
    } else {
      console.log(`- [User Deleted/Not Found] ID: ${id} -> Bookings: ${count}`);
    }
  }

  await mongoose.disconnect();
}

debug().catch(console.error);
