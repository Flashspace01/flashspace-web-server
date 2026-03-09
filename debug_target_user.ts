import mongoose from "mongoose";
import { BookingModel } from "./src/flashspaceWeb/bookingModule/booking.model";
import { PropertyModel } from "./src/flashspaceWeb/propertyModule/property.model";

async function debug() {
  await mongoose.connect("mongodb://localhost:27017/myapp");
  const userId = "6989ccdefc41b1c899d3cd32";

  const results: any = {
    userId,
    properties: [],
    bookingsAsPartner: 0,
  };

  results.bookingsAsPartner = await BookingModel.countDocuments({
    partner: userId,
    isDeleted: false,
  });

  const props = await PropertyModel.find({ partner: userId });
  for (const p of props) {
    const bCount = await BookingModel.countDocuments({
      spaceId: p._id,
      isDeleted: false,
    });
    results.properties.push({
      id: p._id,
      name: p.name,
      bookings: bCount,
    });
  }

  console.log(JSON.stringify(results, null, 2));
  await mongoose.disconnect();
}

debug().catch(console.error);
