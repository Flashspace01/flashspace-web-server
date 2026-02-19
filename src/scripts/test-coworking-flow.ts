import axios from "axios";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";
const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// Test Users
// Test Users (from setup-test-users.ts)
const PARTNER_USER = {
  email: "partner@flashspace.com",
  password: "Partner@123",
};
const REVIEWER_USER = { email: "user@flashspace.com", password: "User@123" };

let partnerToken = "";
let reviewerToken = "";
let spaceId = "";

async function run() {
  console.log("🚀 Starting Coworking & Review Flow Test...");

  try {
    // 1. Login as Partner
    console.log("\n🔐 Logging in as Partner...");
    const loginRes = await api.post("/auth/login", PARTNER_USER);
    partnerToken = loginRes.data.data.tokens.accessToken;
    console.log("✅ Partner Logged In");

    // 2. Login as Reviewer
    console.log("\n👤 Logging in as Reviewer...");
    const reviewerLoginRes = await api.post("/auth/login", REVIEWER_USER);
    reviewerToken = reviewerLoginRes.data.data.tokens.accessToken;
    console.log("✅ Reviewer Logged In");

    // 3. Create Coworking Space
    console.log("\n🏢 Creating Coworking Space...");
    const spaceData = {
      name: `Test Space ${Date.now()}`,
      address: "123 Test St, Tech Park",
      city: "Pune",
      area: "Hinjewadi",
      inventory: [
        { type: "Hot Desk", totalUnits: 10, pricePerMonth: 5000 },
        { type: "Private Cabin", totalUnits: 2, pricePerMonth: 15000 },
      ],
      facilities: [
        { name: "WiFi", count: 1 },
        { name: "Coffee Machine", count: 2 },
      ],
      amenities: ["Parking", "AC"],
      coordinates: { lat: 18.5913, lng: 73.7389 },
      images: ["https://example.com/space.jpg"],
    };

    const createRes = await api.post("/coworkingSpace/create", spaceData, {
      headers: { Authorization: `Bearer ${partnerToken}` },
    });
    spaceId = createRes.data.data._id;
    console.log(`✅ Space Created: ${spaceId}`);
    console.log(
      `   Initial Rating: ${createRes.data.data.avgRating} (Expected: 0)`,
    );

    // 4. Add Review 1 (5 Stars) from Partner
    console.log("\n⭐ Adding Review 1 (5 Stars) from Partner...");
    await api.post(
      "/reviews/add",
      {
        spaceId,
        rating: 5,
        comment: "Excellent space, highly recommended!",
      },
      { headers: { Authorization: `Bearer ${partnerToken}` } },
    );
    console.log("✅ Review 1 Added");

    // Check Stats
    let spaceRes = await api.get(`/coworkingSpace/getById/${spaceId}`);
    console.log(`   New Rating: ${spaceRes.data.data.avgRating} (Expected: 5)`);
    console.log(
      `   Total Reviews: ${spaceRes.data.data.totalReviews} (Expected: 1)`,
    );

    if (spaceRes.data.data.avgRating !== 5)
      throw new Error("Rating mismatch after Review 1");

    // 5. Add Review 2 (3 Stars) from Reviewer
    console.log("\n⭐ Adding Review 2 (3 Stars) from Reviewer...");
    await api.post(
      "/reviews/add",
      {
        spaceId,
        rating: 3,
        comment: "Good but could be better.",
      },
      { headers: { Authorization: `Bearer ${reviewerToken}` } },
    );
    console.log("✅ Review 2 Added");

    // Check Stats
    spaceRes = await api.get(`/coworkingSpace/getById/${spaceId}`);
    console.log(`   New Rating: ${spaceRes.data.data.avgRating} (Expected: 4)`);
    console.log(
      `   Total Reviews: ${spaceRes.data.data.totalReviews} (Expected: 2)`,
    );

    if (spaceRes.data.data.avgRating !== 4)
      throw new Error("Rating mismatch after Review 2");

    console.log("\n✅✅ TEST SUITE PASSED SUCCESSFULLY ✅✅");
  } catch (error: any) {
    console.error("\n❌ TEST FAILED");
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

run();
