
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { PropertyModel } from "./src/flashspaceWeb/propertyModule/property.model";

async function test() {
  await mongoose.connect(process.env.DB_URI as string);
  const total = await PropertyModel.countDocuments({});
  const hasId = await PropertyModel.countDocuments({ 
    spaceId: { $ne: null, $exists: true, $ne: "" } 
  });
  
  console.log('--- DB Check ---');
  console.log('TOTAL PROPERTIES:', total);
  console.log('PROPERTIES WITH spaceId:', hasId);
  
  const delhi = await PropertyModel.find({ city: /Delhi/i }).limit(10);
  console.log('--- DELHI SAMPLE ---');
  for (const p of delhi) {
    console.log(`- ${p.name}: [${p.spaceId || "MISSING"}]`);
  }
  
  process.exit(0);
}
test();
