
// Script to check users in the database (READ ONLY)
import mongoose from "mongoose";
import dotenv from "dotenv";
import { UserModel } from "../flashspaceWeb/authModule/models/user.model";

dotenv.config();

async function checkUsers() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.DB_URI as string);
        console.log("Connected to database successfully!");

        const email = "test@example.com";

        const users = await UserModel.find({ email: email });
        console.log(`Found ${users.length} users with email ${email}`);

        users.forEach(u => {
            console.log(`- ID: ${u._id}, Verified: ${u.isEmailVerified}, Role: ${u.role}, isDeleted: ${u.isDeleted}, PasswordSet: ${!!u.password}`);
        });

        if (users.length === 0) {
            console.log("User NOT found.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error checking users:", error);
        process.exit(1);
    }
}

checkUsers();
