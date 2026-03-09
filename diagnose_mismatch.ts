import mongoose from "mongoose";
import { BookingModel } from "./src/flashspaceWeb/bookingModule/booking.model";
import { PropertyModel } from "./src/flashspaceWeb/propertyModule/property.model";
import { CoworkingSpaceModel } from "./src/flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "./src/flashspaceWeb/virtualOfficeModule/virtualOffice.model";

async function debug() {
  await mongoose.connect("mongodb://localhost:27017/myapp");
  const userId = "6989ccdefc41b1c899d3cd32";

  console.log(`Checking data for Partner ID: ${userId}`);

  // 1. Find all spaces owned by this partner
  const coworkingSpaces = await CoworkingSpaceModel.find({ partner: userId });
  const virtualOffices = await VirtualOfficeModel.find({ partner: userId });

  const spaceIds = [
    ...coworkingSpaces.map((s) => s._id),
    ...virtualOffices.map((v) => v._id),
  ];

  console.log(
    `Partner owns ${coworkingSpaces.length} CoworkingSpaces and ${virtualOffices.length} VirtualOffices.`,
  );

  // 2. Find ALL bookings for these spaces
  const bookingsForOwnedSpaces = await BookingModel.find({
    spaceId: { $in: spaceIds },
    isDeleted: false,
  });

  console.log(
    `Total bookings found for these spaces: ${bookingsForOwnedSpaces.length}`,
  );

  for (const b of bookingsForOwnedSpaces) {
    console.log(
      `- Booking ${b.bookingNumber}: Partner ID in Booking is ${b.partner}`,
    );
    if (b.partner.toString() !== userId) {
      console.log(
        `  !!! MISMATCH: Booking says partner is ${b.partner}, but space belongs to ${userId}`,
      );
    }
  }

  // 3. Find if there are any properties owned that have these spaces
  const props = await PropertyModel.find({ partner: userId });
  const propIds = props.map((p) => p._id);
  console.log(`Partner owns ${props.length} Properties.`);

  await mongoose.disconnect();
}

debug().catch(console.error);
