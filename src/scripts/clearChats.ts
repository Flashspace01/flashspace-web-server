import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function clearChats() {
  const uri = process.env.DB_URI || "mongodb://localhost:27017/myapp";
  
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected successfully.");

    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not connected");
    const collections = ["tickets", "supporttickets", "chatsessions", "affiliate_support_tickets"];

    for (const colName of collections) {
      const collection = db.collection(colName);
      const count = await collection.countDocuments();
      if (count > 0) {
        console.log(`Deleting ${count} documents from ${colName}...`);
        await collection.deleteMany({});
        console.log(`Cleared ${colName}.`);
      } else {
        console.log(`Collection ${colName} is already empty.`);
      }
    }

    console.log("All chat data has been removed successfully.");
  } catch (error) {
    console.error("Error clearing chat data:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

clearChats();
