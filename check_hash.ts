import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const dbUri = process.env.DB_URI || "mongodb://127.0.0.1:27017/myapp";

async function run() {
  try {
    await mongoose.connect(dbUri);
    const db = mongoose.connection.getClient().db("myapp");

    const user = await db
      .collection("users")
      .findOne({ email: "admin@flashspace.co" });
    console.log("admin@flashspace.co password in DB:", user?.password);

    const testUser = await db
      .collection("users")
      .findOne({ email: "test@example.com" });
    console.log("test@example.com password in DB:", testUser?.password);
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
