/**
 * Backfill spaceId on Property documents (and log what was updated).
 *
 * Usage:
 *   DB_URI="mongodb://localhost:27017/flashspace" ts-node src/scripts/backfillSpaceIds.ts
 *
 * IMPORTANT:
 * - Only real spaceIds should be supplied.
 * - No synthetic / guessed IDs are added; unknown items are logged for manual follow‑up.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";

dotenv.config();

// Fill this map with real spaceIds keyed by property name (or ObjectId string if names collide).
// Example: "Workzone - Ahmedabad": "FSAMD04"
const SPACE_ID_MAP: Record<string, string> = {
  // "Workzone - Ahmedabad": "FSAMD04",
  // "CP Alt F": "FSDLI12",
};

async function run() {
  const uri = process.env.DB_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ DB_URI/MONGODB_URI missing");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Connected");

  const properties = await PropertyModel.find({});
  let updated = 0;
  const missing: string[] = [];

  for (const prop of properties) {
    // Already has a spaceId; leave it as-is.
    if (prop.spaceId && String(prop.spaceId).trim().length > 0) continue;

    const keyByName = prop.name?.trim();
    const keyById = prop._id.toString();
    const spaceId =
      (keyByName && SPACE_ID_MAP[keyByName]) || SPACE_ID_MAP[keyById];

    if (!spaceId) {
      missing.push(`${prop._id} | ${prop.name} | ${prop.city}`);
      continue;
    }

    prop.spaceId = spaceId;
    await prop.save();
    updated++;
    console.log(`✅ Set spaceId=${spaceId} for property "${prop.name}" (${prop._id})`);
  }

  console.log(`\nSummary: updated ${updated} properties.`);
  if (missing.length) {
    console.log("⚠️ Still missing spaceId for:");
    missing.forEach((m) => console.log(" - " + m));
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
