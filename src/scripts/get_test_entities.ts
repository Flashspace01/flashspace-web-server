import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { UserModel } from "../flashspaceWeb/authModule/models/user.model";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingspace.model";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function getTestEntities() {
  try {
    const dbUri = process.env.DB_URI || "mongodb://localhost:27017/flashspace";
    await mongoose.connect(dbUri);
    console.log("Connected to MongoDB...");

    // Get a User
    const user =
      (await UserModel.findOne({ email: "customer@flashspace.ai" })) ||
      (await UserModel.findOne({}));
    if (!user) {
      console.error("No users found! Run seed script first.");
      process.exit(1);
    }

    // Get a Coworking Space
    const space = await CoworkingSpaceModel.findOne({});
    if (!space) {
      console.error("No coworking spaces found! Run seed script first.");
      process.exit(1);
    }

    console.log("\n=== TEST DATA ===");
    console.log("User ID:", user._id);
    console.log("User Email:", user.email);
    console.log("User Name:", user.fullName);
    console.log("User Phone:", user.phoneNumber || "9876543210");
    console.log("---");
    console.log("Space ID:", space._id);
    console.log("Space Name:", space.name);
    console.log("Space Price:", space.price); // Assuming it has price

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

getTestEntities();
