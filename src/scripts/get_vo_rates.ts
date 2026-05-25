import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// Connect to MongoDB without specifying dbName so it uses the default (test)
const DB_URI = process.env.DB_URI || "mongodb+srv://flash-space:Stirring_minds@flashspace-database.l3kzod7.mongodb.net/";

const spaceIds = [
  "FSDL01", "FSDL04", "FSDL06", "FSDL05", "FSDL07", "FSDL08", 
  "FSGUR04", "FSGUR03", "FSGUR01", "FSGUR02", "FSNOD02", 
  "FSBLR01", "FSBLR04", "FSBLR02", "FSBLR05", "FSKOL01", "FSKOL02", 
  "FSKOL03", "FSKOL04", "FSHYD01", "FSHYD04", "FSHYD03", "FSHYD05"
];

async function run() {
  try {
    await mongoose.connect(DB_URI);
    console.log("Connected to DB.");

    const Property = mongoose.connection.collection("properties");
    const VirtualOffice = mongoose.connection.collection("virtualoffices");

    const properties = await Property.find({ spaceId: { $in: spaceIds } }).toArray();
    console.log(`Found ${properties.length} properties.`);

    const results = [];
    for (const prop of properties) {
      const vo = await VirtualOffice.findOne({ property: prop._id });
      if (vo) {
        results.push({
          spaceName: prop.name,
          spaceId: prop.spaceId,
          virtualOfficeId: vo._id.toString(),
          partnerBrPricePerYear: vo.partnerBrPricePerYear,
          finalBrPricePerYear: vo.finalBrPricePerYear
        });
      } else {
        console.log(`No Virtual Office found for ${prop.name} (${prop.spaceId})`);
      }
    }

    console.log("\n--- VIRTUAL OFFICE DETAILS ---");
    // Sort by spaceId to keep consistent order
    results.sort((a, b) => a.spaceId.localeCompare(b.spaceId));
    console.table(results);
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from DB.");
  }
}

run();
