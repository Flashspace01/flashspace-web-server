import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const DB_URI = process.env.DB_URI || "mongodb+srv://flash-space:Stirring_minds@flashspace-database.l3kzod7.mongodb.net/";

const ratesToUpdate: Record<string, number> = {
  "FSDL01": 7000,
  "FSDL04": 8500,
  "FSDL06": 8500,
  "FSDL07": 7000,
  "FSDL05": 10000,
  "FSDL08": 11000,
  "FSGUR04": 7000,
  "FSGUR03": 7000,
  "FSGUR01": 10000,
  "FSNOD02": 10000,
  "FSBLR01": 9000,
  "FSBLR02": 9000,
  "FSBLR05": 8500,
  "FSBLR04": 9000,
  "FSKOL01": 11000,
  "FSKOL02": 11000,
  "FSKOL03": 11000,
  "FSKOL04": 11000,
  "FSHYD01": 10500,
  "FSHYD04": 10500,
  "FSHYD03": 10500,
  "FSHYD05": 10500
};

async function run() {
  try {
    await mongoose.connect(DB_URI);
    console.log("Connected to DB.");

    const Property = mongoose.connection.collection("properties");
    const VirtualOffice = mongoose.connection.collection("virtualoffices");

    for (const [spaceId, newRate] of Object.entries(ratesToUpdate)) {
      const prop = await Property.findOne({ spaceId });
      if (!prop) {
        console.log(`❌ Property not found for Space ID: ${spaceId}`);
        continue;
      }

      const result = await VirtualOffice.updateOne(
        { property: prop._id },
        { $set: { partnerBrPricePerYear: newRate } }
      );

      if (result.matchedCount > 0) {
        console.log(`✅ Updated ${spaceId} (${prop.name}) to ${newRate}. Modified: ${result.modifiedCount}`);
      } else {
        console.log(`⚠️ Virtual Office not found for Space ID: ${spaceId} (${prop.name})`);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from DB.");
  }
}

run();
