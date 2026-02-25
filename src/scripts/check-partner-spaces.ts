import mongoose from "mongoose";
import dotenv from "dotenv";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";

dotenv.config();

async function checkSpaces() {
  try {
    await mongoose.connect(process.env.DB_URI as string);
    console.log("Connected to Database");

    // Partner ID from previous research (Marc Abbott)
    const partnerId = "699d70f552c07722255f31d0";

    const spaces = await CoworkingSpaceModel.find({
      $or: [{ partner: partnerId }, { managers: partnerId }],
      isDeleted: false,
    }).lean();

    console.log(`Found ${spaces.length} spaces for partner ${partnerId}`);

    if (spaces.length > 0) {
      console.log("Sample Space Data (first 2):");
      console.log(JSON.stringify(spaces.slice(0, 2), null, 2));

      // Check which fields are actually present across all spaces
      const fields = new Set<string>();
      spaces.forEach((s) => Object.keys(s).forEach((k) => fields.add(k)));
      console.log("Fields present in these documents:", Array.from(fields));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkSpaces();
