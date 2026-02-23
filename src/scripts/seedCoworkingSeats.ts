import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { dbConnection } from "../config/db.config";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";
import { CoworkingSpaceService } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.service";

async function seed() {
  await dbConnection();
  console.log("Connected to DB");

  const property = await PropertyModel.findOne();
  if (!property) {
    console.error("No property found");
    process.exit(1);
  }

  const dummySpace = await CoworkingSpaceModel.create({
    property: property._id,
    partner: property.partner, // ADD THIS
    capacity: 50,
    pricePerMonth: 1000,
    pricePerDay: 50,
    avgRating: 4.5,
    totalReviews: 120,
    operatingHours: {
      openTime: "09:00",
      closeTime: "18:00",
      daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
    floors: CoworkingSpaceService.generateSeatsForFloors([
      {
        floorNumber: 1,
        name: "Ground Floor",
        tables: [
          { tableNumber: "T1", numberOfSeats: 4 },
          { tableNumber: "T2", numberOfSeats: 4 },
        ],
      },
    ]),
  });

  console.log("Dummy space created successfully:", dummySpace._id);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed", err);
  process.exit(1);
});
