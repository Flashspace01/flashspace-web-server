import { UserModel, UserRole } from "./src/flashspaceWeb/authModule/models/user.model";
import { STAFF_ROLES } from "./src/flashspaceWeb/authModule/config/permissions.config";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function verifyStats() {
    console.log("🚀 Connecting to database...");
    await mongoose.connect(process.env.DB_URI!);
    console.log("✅ Connected.");

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // 1. All Users (Client View)
    console.log("\n--- USER MANAGEMENT (All Active Users) ---");
    const totalUsers = await UserModel.countDocuments({ isDeleted: { $ne: true } });
    const verifiedUsers = await UserModel.countDocuments({ isDeleted: { $ne: true }, isEmailVerified: true });
    const newUsers = await UserModel.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: startOfMonth } });
    console.log(`Total: ${totalUsers}`);
    console.log(`Verified: ${verifiedUsers}`);
    console.log(`New This Month: ${newUsers}`);

    // 2. Team Members (Team View)
    console.log("\n--- TEAM MANAGEMENT (Staff Roles) ---");
    const teamQuery = { isDeleted: { $ne: true }, role: { $in: STAFF_ROLES } };
    const totalTeam = await UserModel.countDocuments(teamQuery);
    const verifiedTeam = await UserModel.countDocuments({ ...teamQuery, isEmailVerified: true });
    const newTeam = await UserModel.countDocuments({ ...teamQuery, createdAt: { $gte: startOfMonth } });
    console.log(`Total Team: ${totalTeam}`);
    console.log(`Verified: ${verifiedTeam}`);
    console.log(`New This Month: ${newTeam}`);

    // 3. Specific Role (e.g., 'admin' filter in User Management)
    console.log("\n--- USER MANAGEMENT (Role: 'admin' filter) ---");
    const adminQuery = { isDeleted: { $ne: true }, role: 'admin' };
    const totalAdmin = await UserModel.countDocuments(adminQuery);
    console.log(`Total Admins: ${totalAdmin}`);

    await mongoose.disconnect();
    console.log("\n👋 Done.");
}

verifyStats().catch(console.error);
