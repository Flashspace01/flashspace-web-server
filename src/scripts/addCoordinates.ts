import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Accurate coordinates for each location based on Google Maps
// Format: Search the exact address on Google Maps, right-click on location, copy coordinates
const coordinatesMap: Record<string, { lat: number; lng: number }> = {
  // Ahmedabad
  "Workzone - Ahmedabad": { lat: 23.0071, lng: 72.5101 }, // World Trade Tower, Makarba
  "Sweet Spot Spaces": { lat: 23.0349, lng: 72.5612 }, // Navrangpura, near Sardar Patel Stadium

  // Bangalore
  "IndiraNagar - Aspire Coworks": { lat: 12.9784, lng: 77.6408 }, // Indiranagar 7th Main Rd
  "Koramangala - Aspire Coworks": { lat: 12.9279, lng: 77.6271 }, // Koramangala 4th Block
  "EcoSpace - Hebbal, HMT Layout": { lat: 13.0358, lng: 77.597 }, // HMT Layout, Ganganagar

  // Chennai
  "WBB Office - Chennai": { lat: 13.0143, lng: 80.2217 }, // Anna Salai, Little Mount
  "Senate Space": { lat: 13.0878, lng: 80.2086 }, // Anna Nagar

  // Delhi - Accurate Google Maps Coordinates
  "Stirring Minds": { lat: 28.648, lng: 77.2265 }, // Kundan Mansion, Asaf Ali Rd, Turkman Gate
  "CP Alt F": { lat: 28.6304, lng: 77.2177 }, // Connaught Lane, Barakhamba
  Virtualexcel: { lat: 28.5279, lng: 77.219 }, // Saket Salcon, next to Select Citywalk Mall
  "Mytime Cowork": { lat: 28.521, lng: 77.213 }, // Lane-2, Westend Marg, Saiyad Ul Ajaib, Saket
  "Okhla Alt F": { lat: 28.542, lng: 77.2736 }, // NH-19, CRRI, Ishwar Nagar, Okhla
  "WBB Office": { lat: 28.6331, lng: 77.2767 }, // Laxmi Nagar, Vijay Block
  "Budha Coworking Spaces": { lat: 28.735, lng: 77.115 }, // Sector-24, Rohini
  "Work & Beyond": { lat: 28.579, lng: 77.064 }, // Kocchar Plaza, Ramphal Chowk, Dwarka Sector 7
  "Getset Spaces": { lat: 28.559, lng: 77.2067 }, // Green Park Extension, S-16, LMR House

  // Gurgaon
  "Infrapro - Sector 44": { lat: 28.4505, lng: 77.0526 }, // Minarch Tower, Sector 44
  "Palm Court - Gurgaon": { lat: 28.4089, lng: 76.9904 }, // Mehrauli Road

  // Dharamshala
  Ghoomakkad: { lat: 32.2396, lng: 76.3239 }, // Sidhbari, Rakkar

  // Hyderabad
  "Cabins 24/7": { lat: 17.463, lng: 78.3713 }, // Golden Tulip Estate, Kondapur, HITEC City
  "CS Coworking": { lat: 17.4401, lng: 78.3489 }, // KNR Square, Gachibowli

  // Jaipur
  "Jeev Business Solutions": { lat: 26.8738, lng: 75.811 }, // Tonk Rd, Gopal Pura Mode

  // Jammu
  "Qubicle Coworking": { lat: 32.7156, lng: 74.8578 }, // Trikuta Nagar
  "Kaytech Solutions": { lat: 32.6899, lng: 74.8378 }, // Civil Airport, Satwari

  // Additional seeded names
  "Baner Tech Park": { lat: 18.559, lng: 73.7868 },
  "Cyber City Hub": { lat: 28.494, lng: 77.0895 },
  "Andheri Hub": { lat: 19.1136, lng: 72.8697 },
  "Koramangala Workspace": { lat: 12.9352, lng: 77.6245 },
  "Salt Lake Coworks": { lat: 22.5764, lng: 88.4333 },
  "BKC Business Center": { lat: 19.0607, lng: 72.8656 },
  "Hi-Tech City Address": { lat: 17.4506, lng: 78.3822 },
  "Indiranagar Prestige": { lat: 12.9719, lng: 77.6412 },
  "Premium Pune Address": { lat: 18.5204, lng: 73.8567 },
};

async function addCoordinates() {
  try {
    console.log("Connecting to database...");
    const dbUri = process.env.DB_URI;
    const dbName = process.env.DB_NAME;
    if (!dbUri) throw new Error("DB_URI missing in .env");

    await mongoose.connect(dbUri, dbName ? { dbName } : undefined);
    console.log("Connected to database successfully!\n");

    let updatedCount = 0;
    let skippedCount = 0;
    let rawUpdatedCount = 0;
    let propertyLocationUpdatedCount = 0;

    const isValidCoordinates = (coords: any) =>
      coords &&
      typeof coords.lat === "number" &&
      typeof coords.lng === "number" &&
      !Number.isNaN(coords.lat) &&
      !Number.isNaN(coords.lng);

    const getBestMatchCoordinates = (spaceDoc: any, propertyDoc?: any) => {
      const candidateNames = [
        propertyDoc?.name,
        spaceDoc?.name,
      ].filter(Boolean) as string[];

      for (const name of candidateNames) {
        if (coordinatesMap[name]) return coordinatesMap[name];
      }

      return undefined;
    };

    const getCoordsFromGeoLocation = (location: any) => {
      if (!Array.isArray(location?.coordinates) || location.coordinates.length !== 2) return undefined;
      const [lng, lat] = location.coordinates;
      if (typeof lat !== "number" || typeof lng !== "number") return undefined;
      return { lat, lng };
    };

    const upsertPropertyLocation = async (propertyDoc: any, coords: { lat: number; lng: number }) => {
      if (!propertyDoc?._id) return;
      const hasValidLocation =
        Array.isArray(propertyDoc.location?.coordinates) &&
        propertyDoc.location.coordinates.length === 2;

      if (!hasValidLocation) {
        await PropertyModel.findByIdAndUpdate(propertyDoc._id, {
          location: {
            type: "Point",
            coordinates: [coords.lng, coords.lat],
          },
        });
        propertyLocationUpdatedCount++;
      }
    };

    // Update CoworkingSpaces
    console.log("Updating Coworking Spaces coordinates...");
    const coworkingSpaces = await CoworkingSpaceModel.find({}).populate(
      "property",
    );

    for (const space of coworkingSpaces) {
      const propertyDoc = (space as any).property;
      const existingCoords = (space as any).coordinates;

      if (isValidCoordinates(existingCoords)) {
        await upsertPropertyLocation(propertyDoc, existingCoords);
        skippedCount++;
        continue;
      }

      const coords = getBestMatchCoordinates(space, propertyDoc);
      if (coords && isValidCoordinates(coords)) {
        await CoworkingSpaceModel.findByIdAndUpdate(space._id, { coordinates: coords });
        await upsertPropertyLocation(propertyDoc, coords);

        console.log(`✓ Updated: ${propertyDoc?.name || (space as any).name || space._id}`);
        updatedCount++;
      } else {
        console.log(`⚠ No coordinates found for: ${propertyDoc?.name || (space as any).name || space._id}`);
      }
    }

    // Update VirtualOffices
    console.log("\nUpdating Virtual Offices coordinates...");
    const virtualOffices = await VirtualOfficeModel.find({}).populate(
      "property",
    );

    for (const office of virtualOffices) {
      const propertyDoc = (office as any).property;
      const existingCoords = (office as any).coordinates;

      if (isValidCoordinates(existingCoords)) {
        await upsertPropertyLocation(propertyDoc, existingCoords);
        skippedCount++;
        continue;
      }

      const coords = getBestMatchCoordinates(office, propertyDoc);
      if (coords && isValidCoordinates(coords)) {
        await VirtualOfficeModel.findByIdAndUpdate(office._id, { coordinates: coords });
        await upsertPropertyLocation(propertyDoc, coords);

        console.log(`✓ Updated: ${propertyDoc?.name || (office as any).name || office._id}`);
        updatedCount++;
      } else {
        console.log(`⚠ No coordinates found for: ${propertyDoc?.name || (office as any).name || office._id}`);
      }
    }

    // Raw fallback for legacy records (fields not present in current schema)
    console.log("\nRunning legacy raw collection coordinate backfill...");

    const propertiesCollection = mongoose.connection.db.collection("properties");
    const coworkingCollection = mongoose.connection.db.collection("coworkingspaces");
    const virtualOfficeCollection = mongoose.connection.db.collection("virtualoffices");

    const properties = await propertiesCollection.find({}).toArray();
    const propertyById = new Map<string, any>();
    for (const property of properties) {
      propertyById.set(String(property._id), property);
    }

    const processLegacyCollection = async (collection: any, label: string) => {
      const docs = await collection.find({}).toArray();
      for (const doc of docs) {
        const existing =
          doc.coordinates ||
          getCoordsFromGeoLocation(doc.location) ||
          getCoordsFromGeoLocation(propertyById.get(String(doc.property))?.location);

        if (isValidCoordinates(existing)) {
          skippedCount++;
          continue;
        }

        const linkedProperty = propertyById.get(String(doc.property));
        const candidateName = doc.name || linkedProperty?.name;
        const coords = candidateName ? coordinatesMap[candidateName] : undefined;

        if (coords && isValidCoordinates(coords)) {
          await collection.updateOne(
            { _id: doc._id },
            {
              $set: {
                coordinates: coords,
                location: { type: "Point", coordinates: [coords.lng, coords.lat] },
              },
            },
          );

          if (linkedProperty?._id) {
            await propertiesCollection.updateOne(
              { _id: linkedProperty._id },
              {
                $set: {
                  location: {
                    type: "Point",
                    coordinates: [coords.lng, coords.lat],
                  },
                },
              },
            );
            propertyLocationUpdatedCount++;
          }

          rawUpdatedCount++;
          updatedCount++;
          console.log(`✓ [${label}] Updated: ${candidateName || doc._id}`);
        } else {
          console.log(`⚠ [${label}] No coordinates found for: ${candidateName || doc._id}`);
        }
      }
    };

    await processLegacyCollection(coworkingCollection, "Coworking");
    await processLegacyCollection(virtualOfficeCollection, "VirtualOffice");

    console.log(
      `\n✅ Coordinates update complete. Updated: ${updatedCount} (legacy raw updates: ${rawUpdatedCount}), Already had coordinates: ${skippedCount}, Property locations synced: ${propertyLocationUpdatedCount}`,
    );

    process.exit(0);
  } catch (error) {
    console.error("Error updating coordinates:", error);
    process.exit(1);
  }
}

addCoordinates();
