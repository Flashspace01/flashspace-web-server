import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function fixIndices() {
  const mongoUri = process.env.DB_URI;
  if (!mongoUri) {
    console.error("DB_URI not found in environment variables");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully.");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    console.log("Listing existing indices...");
    const indexes = await collection.indexes();
    console.log(indexes);

    // Drop emailVerificationOTPExpiry_1
    const otpIndexName = "emailVerificationOTPExpiry_1";
    if (indexes.some(idx => idx.name === otpIndexName)) {
      console.log(`Dropping index: ${otpIndexName}`);
      await collection.dropIndex(otpIndexName);
      console.log(`Dropped ${otpIndexName} successfully.`);
    } else {
      console.log(`${otpIndexName} not found.`);
    }

    // Drop resetPasswordExpiry_1
    const resetIndexName = "resetPasswordExpiry_1";
    if (indexes.some(idx => idx.name === resetIndexName)) {
      console.log(`Dropping index: ${resetIndexName}`);
      await collection.dropIndex(resetIndexName);
      console.log(`Dropped ${resetIndexName} successfully.`);
    } else {
      console.log(`${resetIndexName} not found.`);
    }

    console.log("Indices fixed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing indices:", error);
    process.exit(1);
  }
}

fixIndices();
