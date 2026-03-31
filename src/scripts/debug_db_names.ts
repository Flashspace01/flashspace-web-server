import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function debugNames() {
  const dbUri = process.env.DB_URI;
  if (!dbUri) throw new Error("DB_URI missing");

  await mongoose.connect(dbUri);
  const properties = await PropertyModel.find({}, "name");
  console.log("DB Property Names:");
  properties.forEach(p => console.log(`- "${p.name}"`));
  process.exit(0);
}

debugNames();
