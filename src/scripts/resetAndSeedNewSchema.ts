import "dotenv/config";
import mongoose from "mongoose";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import {
  MeetingRoomModel,
  MeetingRoomType,
} from "../flashspaceWeb/meetingRoomModule/meetingRoom.model";
import {
  UserModel,
  UserRole,
} from "../flashspaceWeb/authModule/models/user.model";
import { CoworkingSpaceService } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.service";

const run = async () => {
  try {
    const dbUri = process.env.DB_URI || "mongodb://localhost:27017/myapp";
    await mongoose.connect(dbUri);
    console.log("Connected to DB");

    console.log("Dropping existing data...");
    await CoworkingSpaceModel.deleteMany({});
    await PropertyModel.deleteMany({});
    await VirtualOfficeModel.deleteMany({});
    await MeetingRoomModel.deleteMany({});
    console.log("Dropped collections.");

    // Find or create partner
    let partner = await UserModel.findOne({ email: "partner@flashspace.com" });
    if (!partner) {
      partner = await UserModel.create({
        email: "partner@flashspace.com",
        fullName: "Test Partner",
        password: "password123",
        role: UserRole.PARTNER,
        isActive: true,
      });
    }

    // Create Property 1: Coworking Space
    const propertyCoworking = await PropertyModel.create({
      partner: partner._id,
      name: "FlashSpace HQ Coworking",
      address: "Tech Park, Building A",
      city: "Mumbai",
      area: "Andheri",
      location: { type: "Point", coordinates: [72.8258, 19.1176] },
      category: "Coworking Space",
      capacity: 100,
      amenities: ["WiFi", "Coffee"],
      images: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
      ],
    });

    // Create CoworkingSpace
    await CoworkingSpaceModel.create({
      property: propertyCoworking._id,
      partner: partner._id,
      capacity: 100,
      pricePerMonth: 12000,
      pricePerDay: 500,
      avgRating: 4.8,
      totalReviews: 45,
      operatingHours: {
        openTime: "09:00",
        closeTime: "18:00",
        daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      },
      floors: CoworkingSpaceService.generateSeatsForFloors([
        {
          floorNumber: 1,
          name: "Main Floor",
          tables: [
            { tableNumber: "T1", numberOfSeats: 10 },
            { tableNumber: "T2", numberOfSeats: 10 },
          ],
        },
      ]),
    });

    // Create Property 2: Meeting Room
    const propertyMR = await PropertyModel.create({
      partner: partner._id,
      name: "FlashSpace Premium Meeting Room",
      address: "Tech Park, Building B",
      city: "Mumbai",
      area: "Bandra",
      location: { type: "Point", coordinates: [72.84, 19.05] },
      category: "Meeting Room",
      capacity: 20,
      amenities: ["Projector", "Whiteboard", "WiFi"],
      images: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
      ],
    });

    // Create MeetingRoom
    await MeetingRoomModel.create({
      property: propertyMR._id,
      partner: partner._id,
      capacity: 20,
      type: MeetingRoomType.CONFERENCE_ROOM,
      pricePerHour: 2000,
      pricePerDay: 12000,
      operatingHours: {
        openTime: "08:00",
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
      minBookingHours: 2,
      avgRating: 4.5,
      totalReviews: 12,
    });

    // Create Property 3: Virtual Office
    const propertyVO = await PropertyModel.create({
      partner: partner._id,
      name: "FlashSpace Virtual Office Prime",
      address: "Nariman Point Tower",
      city: "Mumbai",
      area: "Nariman Point",
      location: { type: "Point", coordinates: [72.82, 18.92] },
      category: "Virtual Office",
      capacity: 1000,
      amenities: ["Mail Handling", "GST Registration"],
      images: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
      ],
    });

    // Create VirtualOffice
    await VirtualOfficeModel.create({
      property: propertyVO._id,
      partner: partner._id,
      gstPlanPricePerYear: 18000,
      mailingPlanPricePerYear: 9000,
      brPlanPricePerYear: 12000,
      availability: "Available Now",
      avgRating: 4.9,
      totalReviews: 88,
    });

    console.log("Successfully seeded new schema data.");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding data:", err);
    process.exit(1);
  }
};

run();
