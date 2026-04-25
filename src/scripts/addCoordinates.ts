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
  "365VirtualCoworkers_MP": { lat: 23.2599, lng: 77.4126 },
  "365Virtualcoworks": { lat: 23.2599, lng: 77.4126 },
  "Andheri Hub": { lat: 19.1136, lng: 72.8697 },
  "ApnaYtCoworkers_Jodhpur": { lat: 26.2684, lng: 73.0059 },
  "Apnayt Coworkers": { lat: 26.1992389, lng: 73.006155 },
  "BKC Business Center": { lat: 19.0607, lng: 72.8656 },
  "Baner Tech Park": { lat: 18.559, lng: 73.7868 },
  "Budha Coworking Spaces": { lat: 28.7268158, lng: 77.0733491 },
  "CP Alt F": { lat: 28.6304203, lng: 77.2200772 },
  "CS Coworking": { lat: 17.4401, lng: 78.3489 },
  "CS Coworking - GachiBowli": { lat: 17.4484393, lng: 78.3614054 },
  "CSCoworkingGachibowli_Hyderabad": { lat: 17.4484393, lng: 78.3614054 },
  "Cabins 24/7": { lat: 17.463, lng: 78.3713 },
  "Camac Street - WorkZone": { lat: 22.5486684, lng: 88.3442228 },
  "CamacStreet_Kolkata": { lat: 22.5486684, lng: 88.3442228 },
  "Chhattisgarh": { lat: 21.2787, lng: 81.8661 },
  "CoSpaces": { lat: 30.3062963, lng: 78.0459798 },
  "Cyber City Hub": { lat: 28.494, lng: 77.0895 },
  "CynergX": { lat: 23.2326, lng: 77.4334 },
  "CynergX_MP": { lat: 23.2326, lng: 77.4334 },
  "Divine Coworking": { lat: 18.561661, lng: 73.7803276 },
  "DivineCoworking_Pune": { lat: 18.561661, lng: 73.7803276 },
  "EcoSpace - Hebbal": { lat: 13.0358, lng: 77.597 },
  "EcoSpace - Hebbal, HMT Layout": { lat: 13.0264718, lng: 77.5883936 },
  "EcospaceHebbal_Bangalore": { lat: 13.0264718, lng: 77.5883936 },
  "GetSetSpaces_Delhi": { lat: 28.5578753, lng: 76.9446457 },
  "Getset Spaces": { lat: 28.5578753, lng: 76.9446457 },
  "Ghoomakkad": { lat: 32.198496, lng: 76.36691 },
  "Ghumakkad_HP": { lat: 32.198496, lng: 76.36691 },
  "Gujarat_Ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "Hi-Tech City Address": { lat: 17.4506, lng: 78.3822 },
  "IndiraNagar - Aspire Coworks": { lat: 12.9785513, lng: 77.6328796 },
  "IndiraNagar_Bangalore": { lat: 12.9785513, lng: 77.6328796 },
  "Indiranagar Prestige": { lat: 12.9719, lng: 77.6412 },
  "Infrapro - Sector 44": { lat: 28.4541099, lng: 77.0678306 },
  "InfrraPro_Gurgaon": { lat: 28.4541099, lng: 77.0678306 },
  "Jeev Business Solutions": { lat: 26.8605651, lng: 75.7884309 },
  "JeevanBusiness_Jaipur": { lat: 26.8605651, lng: 75.7884309 },
  "Kaytech Solutions": { lat: 32.6763476, lng: 74.839509 },
  "KaytechSolutions_JK": { lat: 32.6763476, lng: 74.839509 },
  "Kommon Spaces": { lat: 10.0214688, lng: 76.2711021 },
  "Koramangala - Aspire Coworks": { lat: 12.9368459, lng: 77.6261411 },
  "Koramangala Workspace": { lat: 12.9352, lng: 77.6245 },
  "Koramangala_Bangalore": { lat: 12.9368459, lng: 77.6261411 },
  "Laksh Space - Hebbal, HMT layout": { lat: 13.0264528, lng: 77.5085707 },
  "LakshHebbal_Bangalore": { lat: 13.0264528, lng: 77.5085707 },
  "Louden Street - EasyDaftar": { lat: 22.5437679, lng: 88.3511721 },
  "Makarba_Ahmedabad": { lat: 22.9894244, lng: 72.4310689 },
  "MyTimeCowork_Delhi": { lat: 28.5193209, lng: 77.2010251 },
  "Mytime Cowork": { lat: 28.5193209, lng: 77.1984502 },
  "Near Victoria Memorial - WorkZone": { lat: 22.5418453, lng: 88.3473113 },
  "Okhla Alt F": { lat: 28.5512242, lng: 77.2710071 },
  "OkhlaAltF_Delhi": { lat: 28.5512242, lng: 77.2710071 },
  "Oplus Cowork": { lat: 25.6107093, lng: 85.0575122 },
  "OplusCowork_Patna": { lat: 25.6107093, lng: 85.0575122 },
  "Palm Court - Gurgaon": { lat: 28.4089, lng: 76.9904 },
  "Park Street - EasyDaftar": { lat: 22.5509305, lng: 88.3519798 },
  "Park Street - Workzone": { lat: 22.5544012, lng: 88.3476143 },
  "ParkStreetEasyDaftar_Kolkata": { lat: 22.5437679, lng: 88.3511721 },
  "ParkStreet_Kolkata": { lat: 22.5418453, lng: 88.3473113 },
  "Premium Pune Address": { lat: 18.5204, lng: 73.8567 },
  "Qubicle Coworking": { lat: 32.6904688, lng: 74.878062 },
  "QuibickleCoworking_JK": { lat: 32.6904688, lng: 74.878062 },
  "Rashbehari - EasyDaftar": { lat: 22.5196358, lng: 88.3080372 },
  "RegisterKaroCowork_Delhi": { lat: 28.6139, lng: 77.209 },
  "RegisterKaroOxford_Bangalore": { lat: 12.9716, lng: 77.5946 },
  "RegisterKaro_Mumbai": { lat: 19.076, lng: 72.8777 },
  "RegisterKaro_Punjab": { lat: 30.8422, lng: 75.4168 },
  "RegisterKaro|Ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "RegisterKaro|Bangalore": { lat: 12.9716, lng: 77.5946 },
  "RegisterKaro|Delhi": { lat: 28.6139, lng: 77.209 },
  "SSSpaces_Mysuru": { lat: 12.3023, lng: 76.6268 },
  "Salt Lake Coworks": { lat: 22.5764, lng: 88.4333 },
  "Salt Lake, Sec V - EasyDaftar": { lat: 22.5734792, lng: 88.4274254 },
  "Salt Lake, Sec V - Workzone": { lat: 22.5724611, lng: 88.4343427 },
  "SaltLakeEasyDaftar_Kolkata": { lat: 22.5724611, lng: 88.4343427 },
  "Sanogic Coworking": { lat: 28.6139, lng: 77.209 },
  "Sanogic Coworking Space": { lat: 28.6989748, lng: 77.1126788 },
  "Sanogic Coworking,zirakpur": { lat: 30.6455195, lng: 76.8122981 },
  "SanogicCoworking_Delhi": { lat: 28.6989748, lng: 77.1126788 },
  "SanogicCoworking_Punjab": { lat: 30.901, lng: 75.8573 },
  "Sector 3 - MyWorX": { lat: 28.5850725, lng: 77.3103113 },
  "Sector 63, Noida - Crystaa": { lat: 28.6181289, lng: 77.3795597 },
  "Sector63Crysta_Noida": { lat: 28.6181289, lng: 77.3795597 },
  "Senat_Chennai": { lat: 13.0883669, lng: 80.2152799 },
  "Senate Space": { lat: 13.0883669, lng: 80.2152799 },
  "SpaceHive_Kochi": { lat: 10.0036829, lng: 76.3464392 },
  "Spacehive": { lat: 10.0036829, lng: 76.3464392 },
  "Stirring Minds": { lat: 28.6419581, lng: 77.230509 },
  "StirringMinds_Delhi": { lat: 28.6419581, lng: 77.230509 },
  "Sweet Spot Spaces": { lat: 23.0427955, lng: 72.5593332 },
  "SweetSpot_Ahmedabad": { lat: 23.0427955, lng: 72.5593332 },
  "TEAM COWORK- Palm Court - Gurgaon": { lat: 28.4725201, lng: 77.0521724 },
  "Task Alley Rentals LLP": { lat: 23.0427955, lng: 72.5593332 },
  "TeamCowork_Gurgaon": { lat: 28.4725201, lng: 77.0521724 },
  "The Work Lounge": { lat: 28.4595, lng: 77.0266 },
  "TheWorLaunge_Gurgaon": { lat: 28.4595, lng: 77.0266 },
  "Virtualexcel": { lat: 28.5283, lng: 77.2173 },
  "Vision Cowork": { lat: 28.5193433, lng: 77.1845508 },
  "VisionCowork_Delhi": { lat: 28.5193433, lng: 77.1845508 },
  "WBB Office": { lat: 28.6331, lng: 77.2767 },
  "WBB Office - Chennai": { lat: 13.0143, lng: 80.2217 },
  "WBB Office - Laxmi Nagar": { lat: 28.6331, lng: 77.2767 },
  "WBBOffice_Delhi": { lat: 28.6331, lng: 77.2767 },
  "WBB_Chennai": { lat: 13.0143, lng: 80.2217 },
  "We Grow Coworks": { lat: 19.0655, lng: 72.9868599 },
  "Work & Beyond": { lat: 28.5850018, lng: 77.0556738 },
  "WorkBeyond_Delhi": { lat: 28.5850018, lng: 77.0556738 },
  "WorkShalaSec3_Noida": { lat: 28.406765, lng: 76.9101 },
  "WorkYard CWS": { lat: 30.698397, lng: 76.784799 },
  "WorkYard Coworking, Zirakpur": { lat: 30.658681, lng: 76.858228 },
  "Workshala- sector 3": { lat: 28.406765, lng: 76.9101 },
  "Workyard_Chandigarh": { lat: 30.658681, lng: 76.858228 },
  "Workzone - Ahmedabad": { lat: 22.9894244, lng: 72.4310689 },
};

async function addCoordinates() {
  try {
    console.log("Connecting to database...");
    const dbUri = process.env.DB_URI;
    const dbName = process.env.DB_NAME;
    if (!dbUri) throw new Error("DB_URI missing in .env");

    await mongoose.connect(dbUri, dbName ? { dbName } : undefined);
    console.log("Connected to database successfully!\n");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB database handle is undefined after connection.");
    }

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
      const city = propertyDoc?.address?.city || spaceDoc?.city || spaceDoc?.address?.city || "";
      const names = [
        propertyDoc?.name,
        spaceDoc?.name,
      ].filter(Boolean) as string[];

      for (const name of names) {
        const nameWithCity = city ? `${name}|${city}` : null;
        if (nameWithCity && coordinatesMap[nameWithCity]) return coordinatesMap[nameWithCity];
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
      
      await PropertyModel.findByIdAndUpdate(propertyDoc._id, {
        location: {
          type: "Point",
          coordinates: [coords.lng, coords.lat],
        },
      });
      propertyLocationUpdatedCount++;
    };

    // Update CoworkingSpaces
    console.log("Updating Coworking Spaces coordinates...");
    const coworkingSpaces = await CoworkingSpaceModel.find({}).populate(
      "property",
    );

    for (const space of coworkingSpaces) {
      const propertyDoc = (space as any).property;
      const coords = getBestMatchCoordinates(space, propertyDoc);
      
      if (coords && isValidCoordinates(coords)) {
        await CoworkingSpaceModel.findByIdAndUpdate(space._id, { coordinates: coords });
        await upsertPropertyLocation(propertyDoc, coords);

        console.log(`✓ Updated/Refined: ${propertyDoc?.name || (space as any).name || space._id}`);
        updatedCount++;
      } else if (isValidCoordinates((space as any).coordinates)) {
        await upsertPropertyLocation(propertyDoc, (space as any).coordinates);
        skippedCount++;
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
      const coords = getBestMatchCoordinates(office, propertyDoc);

      if (coords && isValidCoordinates(coords)) {
        await VirtualOfficeModel.findByIdAndUpdate(office._id, { coordinates: coords });
        await upsertPropertyLocation(propertyDoc, coords);

        console.log(`✓ Updated/Refined: ${propertyDoc?.name || (office as any).name || office._id}`);
        updatedCount++;
      } else if (isValidCoordinates((office as any).coordinates)) {
        await upsertPropertyLocation(propertyDoc, (office as any).coordinates);
        skippedCount++;
      } else {
        console.log(`⚠ No coordinates found for: ${propertyDoc?.name || (office as any).name || office._id}`);
      }
    }

    // Raw fallback for legacy records (fields not present in current schema)
    console.log("\nRunning legacy raw collection coordinate backfill...");

    const propertiesCollection = db.collection("properties");
    const coworkingCollection = db.collection("coworkingspaces");
    const virtualOfficeCollection = db.collection("virtualoffices");

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
