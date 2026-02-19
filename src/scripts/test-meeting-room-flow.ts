import axios from "axios";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";
const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// Test Users (from setup-test-users.ts)
const PARTNER_USER = {
  email: "partner@flashspace.com",
  password: "Partner@123",
};

let partnerToken = "";
let roomId = "";

async function run() {
  console.log("🚀 Starting Meeting Room Flow Test...");

  try {
    // 1. Login as Partner
    console.log("\n🔐 Logging in as Partner...");
    const loginRes = await api.post("/auth/login", PARTNER_USER);
    partnerToken = loginRes.data.data.tokens.accessToken;
    console.log("✅ Partner Logged In");

    // 2. Create Meeting Room
    console.log("\n🏢 Creating Meeting Room...");
    const roomData = {
      name: `Test Meeting Room ${Date.now()}`,
      address: "456 Biz Park",
      city: "Pune",
      area: "Baner",
      coordinates: { lat: 18.559, lng: 73.7868 },
      amenities: ["TV", "Whiteboard", "Conferencing Unit"],
      images: ["https://example.com/room.jpg"],
    };

    const createRes = await api.post("/meetingRooms/create", roomData, {
      headers: { Authorization: `Bearer ${partnerToken}` },
    });
    roomId = createRes.data.data._id;
    console.log(`✅ Meeting Room Created: ${roomId}`);
    console.log(`   Name: ${createRes.data.data.name}`);

    // 3. Update Meeting Room
    console.log("\n📝 Updating Meeting Room...");
    const updateData = {
      name: `Updated Room ${Date.now()}`,
      amenities: ["TV", "Whiteboard", "Projector"],
    };
    const updateRes = await api.put(
      `/meetingRooms/update/${roomId}`,
      updateData,
      {
        headers: { Authorization: `Bearer ${partnerToken}` },
      },
    );
    console.log(`✅ Meeting Room Updated`);
    console.log(`   New Name: ${updateRes.data.data.name}`);

    // 4. Verify Update via GetById
    console.log("\n🔍 Verifying Update...");
    const getRes = await api.get(`/meetingRooms/getById/${roomId}`);
    if (getRes.data.data.amenities.includes("Projector")) {
      console.log("✅ Update Verified (Projector added)");
    } else {
      throw new Error("Update verification failed: Projector not found");
    }

    // 5. Delete Meeting Room (Soft Delete)
    console.log("\n🗑️ Deleting Meeting Room...");
    await api.delete(`/meetingRooms/delete/${roomId}`, {
      headers: { Authorization: `Bearer ${partnerToken}` },
    });
    console.log("✅ Meeting Room Deleted");

    // 6. Verify Deletion
    const deletedRes = await api.get(`/meetingRooms/getById/${roomId}`);
    if (deletedRes.data.data.isDeleted) {
      console.log("✅ Deletion Verified (isDeleted: true)");
    } else {
      throw new Error("Deletion verification failed");
    }

    console.log("\n✅✅ TEST SUITE PASSED SUCCESSFULLY ✅✅");
  } catch (error: any) {
    console.error("\n❌ TEST FAILED");
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

run();
