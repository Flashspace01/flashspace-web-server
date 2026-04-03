/**
 * Propagate spaceId from Property to VirtualOffice/CoworkingSpace documents.
 *
 * - DOES NOT generate or guess spaceIds.
 * - Only copies Property.spaceId into the child space if it exists and differs.
 * - Logs missing spaceIds so you can handle them manually.
 *
 * Run:
 *   DB_URI="mongodb://localhost:27017/flashspace" ts-node src/scripts/propagateSpaceIdToSpaces.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";

dotenv.config();

async function run() {
  const uri = process.env.DB_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ DB_URI/MONGODB_URI missing");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Connected");

  const properties = await PropertyModel.find({
    spaceId: { $exists: true, $ne: "" },
  }).select("_id spaceId name city");

  const propertyMap = new Map<string, string>();
  properties.forEach((p) => propertyMap.set(p._id.toString(), p.spaceId!));

  let voUpdated = 0;
  let cwUpdated = 0;
  const missingProps: string[] = [];

  // Virtual Offices
  const vos = await VirtualOfficeModel.find({});
  for (const vo of vos) {
    const pid = vo.property?.toString();
    if (!pid) continue;
    const sid = propertyMap.get(pid);
    if (!sid) {
      missingProps.push(`VO ${vo._id} property ${pid}`);
      continue;
    }
    if (vo.spaceId !== sid) {
      vo.spaceId = sid;
      await vo.save();
      voUpdated++;
      console.log(`VO ${vo._id}: set spaceId=${sid}`);
    }
  }

  // Coworking Spaces
  const cws = await CoworkingSpaceModel.find({});
  for (const cw of cws) {
    const pid = cw.property?.toString();
    if (!pid) continue;
    const sid = propertyMap.get(pid);
    if (!sid) {
      missingProps.push(`CW ${cw._id} property ${pid}`);
      continue;
    }
    if (cw.spaceId !== sid) {
      cw.spaceId = sid;
      await cw.save();
      cwUpdated++;
      console.log(`CW ${cw._id}: set spaceId=${sid}`);
    }
  }

  console.log(`\nSummary: VO updated ${voUpdated}, CW updated ${cwUpdated}.`);
  if (missingProps.length) {
    console.log("⚠️ Missing spaceId on property for:");
    missingProps.forEach((m) => console.log(" - " + m));
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ propagate failed:", err);
  process.exit(1);
});
