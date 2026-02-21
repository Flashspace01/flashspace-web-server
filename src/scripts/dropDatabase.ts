// import "dotenv/config";
// import mongoose from "mongoose";
// import { dbConnection } from "../config/db.config";

// const dropDatabase = async () => {
//   try {
//     console.log("🌱 Connecting to Database...");
//     await dbConnection();

//     console.log("💥 Dropping entire database...");
//     await mongoose.connection.db.dropDatabase();

//     console.log("✅ Database dropped successfully!");
//     process.exit(0);
//   } catch (error) {
//     console.error("❌ Failed to drop database:", error);
//     process.exit(1);
//   }
// };

// dropDatabase();
