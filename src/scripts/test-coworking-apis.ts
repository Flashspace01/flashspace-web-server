import mongoose from "mongoose";
import dotenv from "dotenv";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";
import {
  UserModel,
  UserRole,
} from "../flashspaceWeb/authModule/models/user.model";
import { CoworkingSpaceService } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.service";

dotenv.config();

async function testCoworkingAPIs() {
  try {
    await mongoose.connect(
      process.env.DB_URI || "mongodb://localhost:27017/flashspace",
    );
    console.log("✅ Connected to DB");

    // 1. Setup Data
    const partner = await UserModel.create({
      fullName: "QA Coworking Partner",
      email: `qacwpartner_${Date.now()}@example.com`,
      phone: `+9177777${Math.floor(Math.random() * 10000)}`,
      role: UserRole.PARTNER,
      authProvider: "local",
      status: "active",
      credits: 0,
    });

    // 2. Test createSpace (Testing for the pricing bug identified in the QA doc)
    console.log("🔨 Testing CoworkingSpaceService.createSpace...");
    const spaceData = {
      name: `QA Coworking Space ${Date.now()}`,
      address: "123 QA Test Street",
      city: "QA City",
      area: "QA Area",
      capacity: 100,
      partnerPricePerMonth: 5000, // Zod input
      pricePerDay: 500, // Zod input
      images: ["https://example.com/image.jpg"],
      floors: [
        {
          floorNumber: 1,
          name: "Lobby",
          tables: [
            { tableNumber: "T1", numberOfSeats: 2 }, // Tests seat auto-generation
          ],
        },
      ],
      operatingHours: {
        openTime: "09:00",
        closeTime: "18:00",
        daysOpen: ["Monday", "Tuesday"],
      },
    };

    console.log("🔨 Testing CoworkingSpaceService.createSpace...");
    const createdSpace = await CoworkingSpaceService.createSpace(
      spaceData,
      partner._id.toString(),
    );
    console.log(
      "✅ Service: createSpace - PASS (Space ID:",
      createdSpace._id.toString(),
      ")",
    );

    // 3. Test updateSpace
    console.log("🔨 Testing CoworkingSpaceService.updateSpace...");
    const updatedSpace = await CoworkingSpaceService.updateSpace(
      createdSpace._id.toString(),
      { capacity: 200 },
      partner._id.toString(),
      UserRole.PARTNER,
    );
    if (updatedSpace && updatedSpace.capacity === 200) {
      console.log("✅ Service: updateSpace - PASS");
    } else {
      console.error("❌ Service: updateSpace - FAIL");
    }

    // 4. Test getSpaces (Get All)
    const allSpaces = await CoworkingSpaceService.getSpaces({});
    if (allSpaces.length > 0) {
      console.log("✅ Service: getSpaces (All) - PASS");
    } else {
      console.error("❌ Service: getSpaces (All) - FAIL");
    }

    // 5. Test getSpaces (By City Regex Property intercept)
    const citySpaces = await CoworkingSpaceService.getSpaces({
      city: new RegExp(`^qa city$`, "i"),
    });
    if (
      citySpaces.length > 0 &&
      (citySpaces[0].property as any)?.city === "QA City"
    ) {
      console.log("✅ Service: getSpaces (By City Intercept) - PASS");
    } else {
      console.error("❌ Service: getSpaces (By City Intercept) - FAIL");
    }

    // 6. Test deleteSpace (Soft Delete)
    console.log("🔨 Testing CoworkingSpaceService.deleteSpace...");
    const deletedSpace = await CoworkingSpaceService.deleteSpace(
      createdSpace._id.toString(),
      partner._id.toString(),
      UserRole.PARTNER,
    );
    if (
      deletedSpace &&
      deletedSpace.isDeleted === true &&
      deletedSpace.isActive === false
    ) {
      console.log("✅ Service: deleteSpace - PASS");
    } else {
      console.error("❌ Service: deleteSpace - FAIL");
    }
  } catch (error) {
    console.error("💥 Integration Test Error:", error);
  } finally {
    console.log("🧹 Cleaning up...");
    await mongoose.disconnect();
    console.log("✅ Disconnected & Done");
  }
}

testCoworkingAPIs();
