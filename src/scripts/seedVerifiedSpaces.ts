import mongoose from "mongoose";
import dotenv from "dotenv";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import {
  UserModel,
  UserRole,
} from "../flashspaceWeb/authModule/models/user.model";
import {
  PropertyModel,
  KYCStatus,
  PropertyStatus,
} from "../flashspaceWeb/propertyModule/property.model";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import { SpaceApprovalStatus } from "../flashspaceWeb/shared/enums/spaceApproval.enum";

dotenv.config();

const CITIES = [
  "Delhi",
  "Gurgaon",
  "Bangalore",
  "Mumbai",
  "Hyderabad",
  "Pune",
  "Chennai",
];

async function seedVerifiedSpaces() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.DB_URI as string);
    console.log("Connected to database successfully!");

    console.log(
      "\nClearing existing data (Users with partner role, Properties, CoworkingSpaces, VirtualOffices)...",
    );
    await UserModel.deleteMany({ role: UserRole.PARTNER });
    await PropertyModel.deleteMany({});
    await CoworkingSpaceModel.deleteMany({});
    await VirtualOfficeModel.deleteMany({});
    console.log("Existing data cleared!");

    faker.seed(123); // Fixed seed for reproducible results

    const passwordHash = await bcrypt.hash("Password123!", 10);

    for (let i = 0; i < 5; i++) {
      const cityName = faker.helpers.arrayElement(CITIES);
      const fullName = faker.person.fullName();
      const email = faker.internet
        .email({
          firstName: fullName.split(" ")[0],
          lastName: fullName.split(" ")[1],
        })
        .toLowerCase();

      console.log(`\n--- Creating Partner ${i + 1}: ${fullName} ---`);

      // 1. Create Partner
      const partner = await UserModel.create({
        fullName,
        email,
        password: passwordHash,
        role: UserRole.PARTNER,
        isEmailVerified: true,
        kycVerified: true,
        isActive: true,
        phoneNumber: faker.phone.number(),
      });
      console.log(`Partner created: ${partner.email}`);

      // 2. Create Property
      const propertyName = `${faker.company.name()} Plaza`;
      const property = await PropertyModel.create({
        name: propertyName,
        address: faker.location.streetAddress({ useFullAddress: true }),
        city: cityName,
        area: faker.location.secondaryAddress(),
        features: ["CCTV", "Power Backup", "High Speed Internet", "Parking"],
        kycStatus: KYCStatus.APPROVED,
        status: PropertyStatus.ACTIVE,
        isActive: true,
        partner: partner._id,
        images: [
          "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop",
        ],
      });
      console.log(`Property created: ${property.name} in ${cityName}`);

      // 3. Create Coworking Space
      const coworkingSpace = await CoworkingSpaceModel.create({
        property: property._id,
        partner: partner._id,
        capacity: faker.number.int({ min: 20, max: 100 }),
        partnerPricePerMonth: faker.number.int({ min: 4000, max: 15000 }),
        finalPricePerMonth: faker.number.int({ min: 5000, max: 20000 }),
        approvalStatus: SpaceApprovalStatus.ACTIVE,
        isActive: true,
        operatingHours: {
          openTime: "09:00",
          closeTime: "20:00",
          daysOpen: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
        },
        amenities: ["WiFi", "Tea/Coffee", "Meeting Room", "Reception"],
        images: [
          "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?q=80&w=1200&auto=format&fit=crop",
        ],
      });
      console.log(`Coworking Space created: ID ${coworkingSpace._id}`);

      // 4. Create Virtual Office
      const virtualOffice = await VirtualOfficeModel.create({
        property: property._id,
        partner: partner._id,
        approvalStatus: SpaceApprovalStatus.ACTIVE,
        isActive: true,
        partnerGstPricePerYear: 12000,
        finalGstPricePerYear: 15000,
        partnerMailingPricePerYear: 8000,
        finalMailingPricePerYear: 10000,
        partnerBrPricePerYear: 15000,
        finalBrPricePerYear: 18000,
        amenities: ["Official Address", "GST Registration", "Mail Handling"],
        images: [
          "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=1200&auto=format&fit=crop",
        ],
      });
      console.log(`Virtual Office created: ID ${virtualOffice._id}`);
    }

    console.log("\n✅ Database seeded successfully with verified spaces!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding verified spaces:", error);
    process.exit(1);
  }
}

seedVerifiedSpaces();

// Email: jaleel.bogan@hotmail.com
// Email: karl.cummerata@hotmail.com
// Email: kattie_oreilly92@hotmail.com
// Email: randall_goyette30@gmail.com
// Email: ebba.upton@yahoo.com