import mongoose from "mongoose";
import dotenv from "dotenv";
import { UserModel, UserRole, AuthProvider } from "../flashspaceWeb/authModule/models/user.model";
import { PasswordUtil } from "../flashspaceWeb/authModule/utils/password.util";

dotenv.config();

const dummyUsers = [
  {
    email: "dummy.user@flashspace.co",
    fullName: "Dummy User",
    role: UserRole.USER,
    password: "Password@123",
  },
  {
    email: "dummy.admin@flashspace.co",
    fullName: "Dummy Admin",
    role: UserRole.ADMIN,
    password: "Password@123",
  },
  {
    email: "dummy.partner@flashspace.co",
    fullName: "Dummy Partner",
    role: UserRole.PARTNER,
    password: "Password@123",
  },
  {
    email: "dummy.affiliate@flashspace.co",
    fullName: "Dummy Affiliate",
    role: UserRole.AFFILIATE,
    password: "Password@123",
  },
];

async function seedDummyCredentials() {
  try {
    if (!process.env.DB_URI) {
      throw new Error("DB_URI is missing in .env");
    }

    console.log("🚀 Connecting to database...");
    await mongoose.connect(process.env.DB_URI);
    console.log("✅ Connected to database");

    for (const userData of dummyUsers) {
      const normalizedEmail = userData.email.toLowerCase();
      const existingUser = await UserModel.findOne({ email: normalizedEmail });
      const hashedPassword = await PasswordUtil.hash(userData.password);

      const payload = {
        email: normalizedEmail,
        fullName: userData.fullName,
        role: userData.role,
        password: hashedPassword,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        isActive: true,
        isDeleted: false,
      };

      if (existingUser) {
        await UserModel.findByIdAndUpdate(existingUser._id, payload);
        console.log(`ℹ️ Updated: ${normalizedEmail} (${userData.role})`);
      } else {
        await UserModel.create(payload);
        console.log(`✨ Created: ${normalizedEmail} (${userData.role})`);
      }
    }

    console.log("\n✅ Dummy credentials ready:");
    dummyUsers.forEach((user) => {
      console.log(`- ${user.role}: ${user.email} / ${user.password}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to seed dummy credentials:", error);
    process.exit(1);
  }
}

seedDummyCredentials();
