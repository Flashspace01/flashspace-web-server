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

const PARTNER_EMAIL = "partner-workzoneahmedabadahmedabad@flashspace.ai";

const MOCK_REVIEWS = [
  {
    rating: 5,
    comment:
      "Exceptional facilities and very professional environment. Highly recommended for startups!",
    nps: 10,
  },
  {
    rating: 4,
    comment:
      "Great location and very helpful staff. The internet speed is fantastic.",
    nps: 9,
  },
  {
    rating: 5,
    comment:
      "I've been using this virtual office for 6 months now. Zero issues, perfect for my business registration.",
    nps: 10,
  },
  {
    rating: 3,
    comment:
      "Good space, but the cafeteria could be better. Overall a decent experience.",
    nps: 7,
  },
  {
    rating: 5,
    comment:
      "The meeting rooms are top-notch. High-quality projectors and comfortable seating.",
    nps: 9,
  },
  {
    rating: 4,
    comment: "Very clean and quiet. Perfect for deep work sessions.",
    nps: 8,
  },
  {
    rating: 5,
    comment:
      "Five stars! The team here is amazing and the community events are a great bonus.",
    nps: 10,
  },
  {
    rating: 2,
    comment:
      "Had some issues with the AC in the afternoon. Hope they fix it soon.",
    nps: 4,
  },
  {
    rating: 4,
    comment: "Solid coworking space. Reliable and affordable.",
    nps: 8,
  },
  {
    rating: 5,
    comment: "Perfect for client meetings. Impressive ambiance.",
    nps: 10,
  },
];

async function seed() {
  try {
    console.log("🌱 Connecting to database...");
    await dbConnection();

    console.log(`🔍 Finding partner: ${PARTNER_EMAIL}`);
    const partner = await UserModel.findOne({ email: PARTNER_EMAIL });
    if (!partner) {
      console.error("❌ Partner not found!");
      process.exit(1);
    }

    console.log("🏢 Finding properties for partner...");
    const properties = await PropertyModel.find({ partner: partner._id });
    const propertyIds = properties.map((p) => p._id);
    console.log(`Found ${properties.length} properties.`);

    if (propertyIds.length === 0) {
      console.error("❌ No properties found for this partner!");
      process.exit(1);
    }

    console.log("🛰️ Finding spaces...");
    const [coworking, virtual, meeting] = await Promise.all([
      CoworkingSpaceModel.find({ property: { $in: propertyIds } }),
      VirtualOfficeModel.find({ property: { $in: propertyIds } }),
      MeetingRoomModel.find({ property: { $in: propertyIds } }),
    ]);

    const allSpaces = [
      ...coworking.map((s) => ({ id: s._id, model: "CoworkingSpace" })),
      ...virtual.map((s) => ({ id: s._id, model: "VirtualOffice" })),
      ...meeting.map((s) => ({ id: s._id, model: "MeetingRoom" })),
    ];

    console.log(`Found ${allSpaces.length} spaces.`);

    if (allSpaces.length === 0) {
      console.error("❌ No spaces found for this partner!");
      process.exit(1);
    }

    console.log("👤 Fetching random users to be reviewers...");
    const users = await UserModel.find({ role: "user" }).limit(20);
    if (users.length === 0) {
      console.error("❌ No standard users found to act as reviewers!");
      process.exit(1);
    }

    console.log(
      `🧹 Clearing existing reviews for these spaces to avoid unique index conflicts...`,
    );
    await ReviewModel.deleteMany({
      space: { $in: allSpaces.map((s) => s.id) },
    });

    console.log(`✍️ Creating ${allSpaces.length * 3} random reviews...`);
    for (const space of allSpaces) {
      // Give each space 2-4 reviews
      const numReviews = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < numReviews; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const mock =
          MOCK_REVIEWS[Math.floor(Math.random() * MOCK_REVIEWS.length)];

        // We use .create() so the post-save hook updates the space's avgRating/totalReviews
        await ReviewModel.create({
          user: randomUser._id,
          space: space.id,
          spaceModel: space.model,
          rating: mock.rating,
          comment: mock.comment,
          npsScore: mock.nps,
          createdAt: new Date(
            Date.now() - Math.floor(Math.random() * 1000000000),
          ), // Random date in last ~11 days
        });
      }
      console.log(`✅ Seeded reviews for ${space.model} (${space.id})`);
    }

    console.log("\n✨ SEEDING COMPLETE!");
    console.log(
      `Partner ${PARTNER_EMAIL} now has realistic reviews and NPS data.`,
    );
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seed();
