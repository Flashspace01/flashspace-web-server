import mongoose from "mongoose";
import dotenv from "dotenv";
import { UserRepository } from "./src/flashspaceWeb/authModule/repositories/user.repository";

dotenv.config();
const dbUri = process.env.DB_URI || "mongodb://127.0.0.1:27017/myapp";

async function run() {
  try {
    await mongoose.connect(dbUri);
    console.log("Connected to DB:", dbUri);

    const repo = new UserRepository();
    const user = await repo.findByEmailForAuth("admin@flashspace.co");

    console.log("User found via findByEmailForAuth:", user ? "Yes" : "No");
    if (user) {
      console.log("Email:", user.email);
      console.log("Has password field:", !!user.password);
      console.log("Password hash:", user.password);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
