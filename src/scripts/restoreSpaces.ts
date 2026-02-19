import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingspace.model";

const restoreSpaces = async () => {
  try {
    if (!process.env.DB_URI) {
      console.error("DB_URI is not defined in environment variables");
      process.exit(1);
    }

    await mongoose.connect(process.env.DB_URI);
    console.log("Connected to Database");

    const voResult = await VirtualOfficeModel.updateMany(
      { isDeleted: true },
      { $set: { isDeleted: false, isActive: true } },
    );
    console.log(`Restored ${voResult.modifiedCount} virtual offices.`);

    const coResult = await CoworkingSpaceModel.updateMany(
      { isDeleted: true },
      { $set: { isDeleted: false, isActive: true } },
    );
    console.log(`Restored ${coResult.modifiedCount} coworking spaces.`);

    console.log("Restoration complete.");
    process.exit(0);
  } catch (error) {
    console.error("Restoration failed:", error);
    process.exit(1);
  }
};

restoreSpaces();
