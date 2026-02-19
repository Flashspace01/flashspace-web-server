import axios from "axios";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";
const PARTNER_EMAIL = "partner@flashspace.ai";
const PARTNER_PASSWORD = "SpacePortal@2026";

let authToken = "";

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

async function main() {
  console.log("🚀 TESTING CROSS-MODULE REVIEW INTEGRATION");

  // 1. Auth
  const login = await api.post("/auth/login", {
    email: PARTNER_EMAIL,
    password: PARTNER_PASSWORD,
  });
  authToken = login.data.data.tokens.accessToken;
  const headers = { Authorization: `Bearer ${authToken}` };

  // 2. Setup: Create one of each or find existing
  console.log("--- Phase 1: Create Spaces ---");

  // Meeting Room
  const mr = await api.post(
    "/meetingRoom/create",
    {
      name: "MR for Review Test",
      address: "Test Addr",
      city: "Pune",
      area: "Baner",
      price: 1000,
      type: "meeting_room",
      amenities: ["WiFi"],
      images: ["https://example.com/1.jpg"],
    },
    { headers },
  );
  const mrId = mr.data.data._id;
  console.log("Created Meeting Room:", mrId);

  // Event Space
  const es = await api.post(
    "/eventSpace/create",
    {
      name: "ES for Review Test",
      address: "Test Addr",
      city: "Pune",
      area: "Baner",
      price: 5000,
      type: "conference_hall",
      amenities: ["Stage"],
      images: ["https://example.com/2.jpg"],
    },
    { headers },
  );
  const esId = es.data.data._id;
  console.log("Created Event Space:", esId);

  // 3. Post Reviews
  console.log("\n--- Phase 2: Post Reviews ---");

  await api.post(
    "/reviews/add",
    {
      spaceId: mrId,
      spaceModel: "MeetingRoom",
      rating: 5,
      comment: "Great meeting room!",
    },
    { headers },
  );
  console.log("Review posted for Meeting Room");

  await api.post(
    "/reviews/add",
    {
      spaceId: esId,
      spaceModel: "EventSpace",
      rating: 4,
      comment: "Good event hall!",
    },
    { headers },
  );
  console.log("Review posted for Event Space");

  // 4. Verify Ratings
  console.log("\n--- Phase 3: Verify Ratings ---");

  const mrVerify = await api.get(`/meetingRoom/getById/${mrId}`);
  console.log(
    `Meeting Room Rating: ${mrVerify.data.data.avgRating}, Reviews: ${mrVerify.data.data.totalReviews}`,
  );
  if (
    mrVerify.data.data.avgRating !== 5 ||
    mrVerify.data.data.totalReviews !== 1
  )
    throw new Error("MR Rating Update Failed");

  const esVerify = await api.get(`/eventSpace/getById/${esId}`);
  console.log(
    `Event Space Rating: ${esVerify.data.data.avgRating}, Reviews: ${esVerify.data.data.totalReviews}`,
  );
  if (
    esVerify.data.data.avgRating !== 4 ||
    esVerify.data.data.totalReviews !== 1
  )
    throw new Error("ES Rating Update Failed");

  console.log("\n✅ ALL INTEGRATION TESTS PASSED");

  // Cleanup (Optional)
  await api.delete(`/meetingRoom/delete/${mrId}`, { headers });
  await api.delete(`/eventSpace/delete/${esId}`, { headers });
}

main().catch((err) => {
  console.error("❌ TEST FAILED:", err.message);
  if (err.response) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
