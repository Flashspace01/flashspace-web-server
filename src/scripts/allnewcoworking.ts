console.log("Starting seed script for new coworking spaces...");
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { CoworkingSpaceModel } from "../../src/flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import {
  UserModel,
  UserRole,
} from "../../src/flashspaceWeb/authModule/models/user.model";
import {
  PropertyModel,
  KYCStatus,
  PropertyStatus,
} from "../../src/flashspaceWeb/propertyModule/property.model";
import { SpaceApprovalStatus } from "../../src/flashspaceWeb/shared/enums/spaceApproval.enum";

// Import the data
import { newCoworkingSpaces } from "./coworkingnewseed";

dotenv.config();

// Helper to extract city from address
function extractCity(address: string): string {
    const lower = address.toLowerCase();
    if (lower.includes('delhi') || lower.includes('new delhi')) return 'Delhi';
    if (lower.includes('gurgaon') || lower.includes('gurugram')) return 'Gurgaon';
    if (lower.includes('noida')) return 'Noida';
    if (lower.includes('mumbai')) return 'Mumbai';
    if (lower.includes('bangalore') || lower.includes('bengaluru')) return 'Bangalore';
    if (lower.includes('hyderabad')) return 'Hyderabad';
    if (lower.includes('chennai')) return 'Chennai';
    if (lower.includes('pune')) return 'Pune';
    if (lower.includes('ahmedabad')) return 'Ahmedabad';
    if (lower.includes('jaipur')) return 'Jaipur';
    if (lower.includes('jammu')) return 'Jammu';
    if (lower.includes('dharamshala')) return 'Dharamshala';
    
    // Default fallback
    return 'Delhi';
}

async function generatePropertyAndPartner(space: any) {
  const city = extractCity(space.address || "");
  const emailIdentifier = `${space.name}-${city}`
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .substring(0, 30);
  const email = `partner-${emailIdentifier}@flashspace.ai`;

  // 1. Create or Find User
  let user = await UserModel.findOne({ email });
  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("Password123!", salt);
    user = await UserModel.create({
      email,
      fullName: `Partner ${space.name}`,
      password: hashedPassword,
      role: UserRole.PARTNER,
      kycVerified: true,
      isActive: true,
      isEmailVerified: true,
    });
  }

  // 2. Create or Find Property
  let property = await PropertyModel.findOne({ name: space.name, address: space.address });
  if (!property) {
    const features = [];
    if (space.description) {
        if (space.description.toLowerCase().includes('wifi')) features.push('WiFi');
        if (space.description.toLowerCase().includes('parking')) features.push('Parking');
        if (space.description.toLowerCase().includes('meeting')) features.push('Meeting Rooms');
        if (space.description.toLowerCase().includes('cafeteria') || space.description.toLowerCase().includes('coffee')) features.push('Cafeteria');
    }
    if (features.length === 0) features.push('High-Speed WiFi');

    property = await PropertyModel.create({
      name: space.name,
      address: space.address,
      city: city,
      area: city, // Simplified for now
      features: features,
      images: space.image_url ? [space.image_url] : ["https://shorturl.at/Fyr6o"],
      kycStatus: KYCStatus.APPROVED,
      status: PropertyStatus.ACTIVE,
      isActive: true,
      partner: user._id,
      location: { type: "Point", coordinates: [77.209, 28.6139] }, // Dummy coordinate
    });
  }

  return { user, property, city };
}

async function seedDatabase() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.DB_URI as string);
    console.log("Connected to database successfully!");

    console.log(`\nSeeding ${newCoworkingSpaces.length} New Coworking Spaces...`);
    let count = 0;
    
    for (const space of newCoworkingSpaces) {
      if (!space.name || !space.address) continue;
      
      const { user, property, city } = await generatePropertyAndPartner(space);

      // Check if space already exists to avoid duplicates
      const existingSpace = await CoworkingSpaceModel.findOne({ property: property._id });
      if (!existingSpace) {
        // Parse price
        let price = 5000;
        if (space.price && space.price.amount) {
            price = space.price.amount;
        } else if (space.price && typeof space.price === 'number') {
            price = space.price;
        }

        let rating = 4.5;
        if (space.rating !== null && space.rating !== undefined) {
            rating = Number(space.rating);
        }

        await CoworkingSpaceModel.create({
          property: property._id,
          partner: user._id,
          capacity: 50,
          sponsored: false,
          popular: false,
          approvalStatus: SpaceApprovalStatus.ACTIVE,
          partnerPricePerMonth: price,
          adminMarkupPerMonth: Math.round(price * 0.2), // 20% markup example
          finalPricePerMonth: price,
          avgRating: rating,
          totalReviews: Math.floor(Math.random() * 50) + 1,
          amenities: ["High-Speed WiFi", "Air Conditioning", "Cafeteria", "Lounge"],
          images: space.image_url ? [space.image_url] : ["https://shorturl.at/Fyr6o"],
          isActive: true,
          isDeleted: false,
          operatingHours: {
              openTime: "09:00",
              closeTime: "18:00"
          },
          floors: [
            {
              floorNumber: 1,
              name: "Main Floor",
              tables: [
                {
                  tableNumber: "T1",
                  seats: Array.from({ length: 50 }).map((_, i) => ({
                      seatNumber: `S${i+1}`,
                      isActive: true
                  }))
                }
              ]
            }
          ]
        });
        count++;
        if (count % 10 === 0) {
            console.log(`Seeded ${count} spaces...`);
        }
      }
    }

    console.log(`\nSuccessfully seeded ${count} new coworking spaces!`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
}

seedDatabase();
