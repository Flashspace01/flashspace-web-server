import mongoose from "mongoose";
import { UserModel } from "../flashspaceWeb/authModule/models/user.model";
import { PasswordUtil } from "../flashspaceWeb/authModule/utils/password.util";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  try {
    const uri = process.env.DB_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("DB_URI is missing");
    await mongoose.connect(uri);

    const hashedPassword = await PasswordUtil.hash("Test@123");

    await UserModel.findOneAndUpdate(
      { email: "test@example.com" },
      {
        email: "test@example.com",
        fullName: "Test Admin",
        password: hashedPassword,
        isEmailVerified: true,
        authProvider: "local",
        role: "admin",
      },
      { upsert: true, new: true },
    );

    console.log(
      "Test user (test@example.com / Test@123) created/updated successfully with ADMIN role.",
    );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
