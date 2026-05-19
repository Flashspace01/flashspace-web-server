import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import mongoose from "mongoose";
import { dbConnection } from "../config/db.config";
import { UserModel } from "../flashspaceWeb/authModule/models/user.model";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import { MeetingRoomModel } from "../flashspaceWeb/meetingRoomModule/meetingRoom.model";
import { ReviewModel } from "../flashspaceWeb/reviewsModule/review.model";

const MOCK_REVIEWS = [
  {
    rating: 5,
    comment: "Exceptional facilities and very professional environment. Highly recommended for startups!",
    nps: 10,
  },
  {
    rating: 4,
    comment: "Great location and very helpful staff. The internet speed is fantastic.",
    nps: 9,
  },
  {
    rating: 5,
    comment: "I've been using this office for 6 months now. Zero issues, perfect for my team.",
    nps: 10,
  },
  {
    rating: 4,
    comment: "Good space, friendly community and nice amenities. Overall a very decent experience.",
    nps: 8,
  },
  {
    rating: 5,
    comment: "The meeting rooms are top-notch. High-quality screens and comfortable seating.",
    nps: 9,
  },
  {
    rating: 4,
    comment: "Very clean, quiet, and beautiful interiors. Perfect for focused deep work.",
    nps: 8,
  },
  {
    rating: 5,
    comment: "Five stars! The team here is amazing and the location is highly accessible.",
    nps: 10,
  },
  {
    rating: 4,
    comment: "Solid workspace with reliable power and backup. Highly affordable too.",
    nps: 8,
  },
  {
    rating: 5,
    comment: "Perfect for client meetings and presentations. Impressive ambiance.",
    nps: 10,
  },
];

async function seed() {
  try {
    console.log("🌱 Connecting to database...");
    await dbConnection();

    console.log("🏢 Finding all properties...");
    const properties = await PropertyModel.find({ isDeleted: { $ne: true } });
    console.log(`Found ${properties.length} properties.`);

    if (properties.length === 0) {
      console.error("❌ No properties found!");
      process.exit(1);
    }

    const propertyIds = properties.map((p) => p._id);

    console.log("🛰️ Finding all spaces...");
    const [coworking, virtual, meeting] = await Promise.all([
      CoworkingSpaceModel.find({ property: { $in: propertyIds }, isDeleted: { $ne: true } }),
      VirtualOfficeModel.find({ property: { $in: propertyIds }, isDeleted: { $ne: true } }),
      MeetingRoomModel.find({ property: { $in: propertyIds }, isDeleted: { $ne: true } }),
    ]);

    const allSpaces = [
      ...coworking.map((s) => ({ id: s._id, model: "CoworkingSpace" })),
      ...virtual.map((s) => ({ id: s._id, model: "VirtualOffice" })),
      ...meeting.map((s) => ({ id: s._id, model: "MeetingRoom" })),
    ];

    console.log(`Found ${allSpaces.length} total spaces.`);

    if (allSpaces.length === 0) {
      console.error("❌ No spaces found!");
      process.exit(1);
    }

    console.log("👤 Fetching standard users to act as reviewers...");
    const users = await UserModel.find({ role: { $in: ["user", "admin"] } }).limit(50);
    if (users.length === 0) {
      console.error("❌ No users found to act as reviewers!");
      process.exit(1);
    }

    console.log("🧹 Clearing old reviews for these spaces to avoid conflicts...");
    await ReviewModel.deleteMany({
      space: { $in: allSpaces.map((s) => s.id) },
    });

    console.log(`✍️ Seeding realistic reviews and computing ratings for ${allSpaces.length} spaces...`);
    for (const space of allSpaces) {
      // Seed 2-4 reviews per space
      const numReviews = Math.floor(Math.random() * 3) + 2;
      
      // Shuffle users array to pick unique ones for this space
      const shuffledUsers = [...users].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < Math.min(numReviews, shuffledUsers.length); i++) {
        const uniqueUser = shuffledUsers[i];
        const mock = MOCK_REVIEWS[Math.floor(Math.random() * MOCK_REVIEWS.length)];

        // We use ReviewModel.create so typegoose calcAverageRatings post-save hook is triggered
        await ReviewModel.create({
          user: uniqueUser._id,
          space: space.id,
          spaceModel: space.model,
          rating: mock.rating,
          comment: mock.comment,
          npsScore: mock.nps,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)), // Random date in last ~11 days
        });
      }
      console.log(`✅ Seeded reviews and calculated avgRating for ${space.model} (${space.id})`);
    }

    console.log("\n✨ GLOBAL REVIEWS SEEDING COMPLETE!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seed();
