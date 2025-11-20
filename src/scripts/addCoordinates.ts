import mongoose from "mongoose";
import dotenv from "dotenv";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";

dotenv.config();

// Accurate coordinates for each location based on Google Maps
const coordinatesMap: Record<string, { lat: number; lng: number }> = {
  // Ahmedabad
  "Workzone - Ahmedabad": { lat: 23.0071, lng: 72.5101 },
  "Sweet Spot Spaces": { lat: 23.0349, lng: 72.5612 },
  
  // Bangalore
  "IndiraNagar - Aspire Coworks": { lat: 12.9784, lng: 77.6408 },
  "Koramangala - Aspire Coworks": { lat: 12.9279, lng: 77.6271 },
  "EcoSpace - Hebbal, HMT Layout": { lat: 13.0358, lng: 77.5970 },
  
  // Chennai
  "WBB Office": { lat: 13.0143, lng: 80.2217 },
  "Senate Space": { lat: 13.0878, lng: 80.2086 },
  
  // Delhi
  "Stirring Minds": { lat: 28.6480, lng: 77.2410 },
  "CP Alt F": { lat: 28.6304, lng: 77.2177 },
  "Virtualexcel": { lat: 28.5244, lng: 77.2066 },
  "Mytime Cowork": { lat: 28.5244, lng: 77.2066 },
  "Okhla Alt F": { lat: 28.5494, lng: 77.2736 },
  // "WBB Office": { lat: 28.6331, lng: 77.2767 },
  "Budha Coworking Spaces": { lat: 28.7496, lng: 77.1166 },
  "Work & Beyond": { lat: 28.5822, lng: 77.0461 },
"Getset Spaces": { lat: 28.5494, lng: 77.2067 },
  
  // Gurgaon
  "Infrapro - Sector 44": { lat: 28.4505, lng: 77.0526 },
  "Palm Court - Gurgaon": { lat: 28.4089, lng: 76.9904 },
  
  // Dharamshala
  "Ghoomakkad": { lat: 32.2396, lng: 76.3239 },
  
  // Hyderabad
  "Cabins 24/7": { lat: 17.4630, lng: 78.3713 },
  "CS Coworking": { lat: 17.4401, lng: 78.3489 },
  
  // Jaipur
  "Jeev Business Solutions": { lat: 26.8738, lng: 75.8110 },
  
  // Jammu
  "Qubicle Coworking": { lat: 32.7156, lng: 74.8578 },
  "Kaytech Solutions": { lat: 32.6899, lng: 74.8378 },
};

async function addCoordinates() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.DB_URI as string);
    console.log("Connected to database successfully!\n");

    let updatedCount = 0;

    // Update CoworkingSpaces
    console.log("Updating Coworking Spaces coordinates...");
    const coworkingSpaces = await CoworkingSpaceModel.find({});
    
    for (const space of coworkingSpaces) {
      const coords = coordinatesMap[space.name];
      if (coords) {
        await CoworkingSpaceModel.findByIdAndUpdate(space._id, {
          coordinates: coords
        });
        console.log(`✓ Updated: ${space.name} - ${space.city}`);
        updatedCount++;
      } else {
        console.log(`⚠ No coordinates found for: ${space.name}`);
      }
    }

    // Update VirtualOffices
    console.log("\nUpdating Virtual Offices coordinates...");
    const virtualOffices = await VirtualOfficeModel.find({});
    
    for (const office of virtualOffices) {
      const coords = coordinatesMap[office.name];
      if (coords) {
        await VirtualOfficeModel.findByIdAndUpdate(office._id, {
          coordinates: coords
        });
        console.log(`✓ Updated: ${office.name} - ${office.city}`);
        updatedCount++;
      } else {
        console.log(`⚠ No coordinates found for: ${office.name}`);
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} records with coordinates!`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error updating coordinates:", error);
    process.exit(1);
  }
}

addCoordinates();
