// src/scripts/setup-test-users.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Import App Models and Utils
// Note: We need to use relative paths from src/scripts
import {
  UserModel,
  UserRole,
  AuthProvider,
} from "../flashspaceWeb/authModule/models/user.model";
import { PasswordUtil } from "../flashspaceWeb/authModule/utils/password.util";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Connect to MongoDB
const DB_URI = process.env.DB_URI || "mongodb://localhost:27017/flashspace";

async function setupUsers() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to MongoDB successfully!");

    // Define Users
    const users = [
      {
        email: "admin@flashspace.com",
        fullName: "Test Admin",
        password: "Admin@123",
        role: UserRole.ADMIN,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        phoneNumber: "+919876543210",
      },
      {
        email: "partner@flashspace.com",
        fullName: "Test Partner",
        password: "Partner@123",
        role: UserRole.PARTNER,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        phoneNumber: "+919876543211",
      },
      {
        email: "sales@flashspace.com",
        fullName: "Test Sales",
        password: "Sales@123",
        role: UserRole.SALES,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        phoneNumber: "+919876543213",
      },
      {
        email: "user@flashspace.com",
        fullName: "Test User",
        password: "User@123",
        role: UserRole.USER,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        phoneNumber: "+919876543214",
      },
    ];

    console.log("\n👤 Creating test users...");

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await UserModel.findOne({ email: userData.email });

      // Hash password using the App's utility
      const hashedPassword = await PasswordUtil.hash(userData.password);

      if (existingUser) {
        // Update existing user
        existingUser.password = hashedPassword;
        existingUser.role = userData.role;
        existingUser.authProvider = userData.authProvider;
        existingUser.isEmailVerified = userData.isEmailVerified;
        existingUser.fullName = userData.fullName;

        await existingUser.save();
        console.log(`↻ Updated ${userData.role} user: ${userData.email}`);
      } else {
        // Create new user
        await UserModel.create({
          ...userData,
          password: hashedPassword,
        });
        console.log(`✅ Created ${userData.role} user: ${userData.email}`);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 ALL TEST USERS SETUP COMPLETE!");
    console.log("=".repeat(50));

    // Display created users
    const allUsers = await UserModel.find({}, "email role -_id");
    console.log("\n📋 Current Users in Database:");
    console.log("-".repeat(40));
    allUsers.forEach((user) => {
      console.log(`${user.email.padEnd(30)} → ${user.role}`);
    });

    console.log("\n🚀 Next step: Run RBAC tests with:");
    console.log("npm run test:rbac");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up test users:", error);
    process.exit(1);
  }
}

// Handle script termination
process.on("SIGINT", async () => {
  console.log("\n\n👋 Script terminated by user");
  await mongoose.disconnect();
  process.exit(0);
});

// Run the setup
setupUsers();
