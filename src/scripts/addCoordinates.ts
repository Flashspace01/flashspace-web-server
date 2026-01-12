import mongoose from "mongoose";
import dotenv from "dotenv";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";

dotenv.config();

// Accurate coordinates for each location based on Google Maps
// Format: Search the exact address on Google Maps, right-click on location, copy coordinates
const coordinatesMap: Record<string, { lat: number; lng: number }> = {
  // Ahmedabad
  "Workzone - Ahmedabad": { lat: 23.0071, lng: 72.5101 },        // World Trade Tower, Makarba
  "Sweet Spot Spaces": { lat: 23.0349, lng: 72.5612 },           // Navrangpura, near Sardar Patel Stadium
  
  // Bangalore
  "IndiraNagar - Aspire Coworks": { lat: 12.9784, lng: 77.6408 }, // Indiranagar 7th Main Rd
  "Koramangala - Aspire Coworks": { lat: 12.9279, lng: 77.6271 }, // Koramangala 4th Block
  "EcoSpace - Hebbal, HMT Layout": { lat: 13.0358, lng: 77.5970 }, // HMT Layout, Ganganagar
  
  // Chennai
  "WBB Office - Chennai": { lat: 13.0143, lng: 80.2217 },        // Anna Salai, Little Mount
  "Senate Space": { lat: 13.0878, lng: 80.2086 },                // Anna Nagar
  
  // Delhi - Accurate Google Maps Coordinates
  "Stirring Minds": { lat: 28.6480, lng: 77.2265 },              // Kundan Mansion, Asaf Ali Rd, Turkman Gate
  "CP Alt F": { lat: 28.6304, lng: 77.2177 },                    // Connaught Lane, Barakhamba
  "Virtualexcel": { lat: 28.5279, lng: 77.2190 },                // Saket Salcon, next to Select Citywalk Mall
  "Mytime Cowork": { lat: 28.5210, lng: 77.2130 },               // Lane-2, Westend Marg, Saiyad Ul Ajaib, Saket
  "Okhla Alt F": { lat: 28.5420, lng: 77.2736 },                 // NH-19, CRRI, Ishwar Nagar, Okhla
  "WBB Office": { lat: 28.6331, lng: 77.2767 },                  // Laxmi Nagar, Vijay Block
  "Budha Coworking Spaces": { lat: 28.7350, lng: 77.1150 },      // Sector-24, Rohini
  "Work & Beyond": { lat: 28.5790, lng: 77.0640 },               // Kocchar Plaza, Ramphal Chowk, Dwarka Sector 7
  "Getset Spaces": { lat: 28.5590, lng: 77.2067 },               // Green Park Extension, S-16, LMR House
  
  // Gurgaon
  "Infrapro - Sector 44": { lat: 28.4505, lng: 77.0526 },        // Minarch Tower, Sector 44
  "Palm Court - Gurgaon": { lat: 28.4089, lng: 76.9904 },        // Mehrauli Road
  
  // Dharamshala
  "Ghoomakkad": { lat: 32.2396, lng: 76.3239 },                  // Sidhbari, Rakkar
  
  // Hyderabad
  "Cabins 24/7": { lat: 17.4630, lng: 78.3713 },                 // Golden Tulip Estate, Kondapur, HITEC City
  "CS Coworking": { lat: 17.4401, lng: 78.3489 },                // KNR Square, Gachibowli
  
  // Jaipur
  "Jeev Business Solutions": { lat: 26.8738, lng: 75.8110 },     // Tonk Rd, Gopal Pura Mode
  
  // Jammu
  "Qubicle Coworking": { lat: 32.7156, lng: 74.8578 },           // Trikuta Nagar
  "Kaytech Solutions": { lat: 32.6899, lng: 74.8378 },           // Civil Airport, Satwari
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
