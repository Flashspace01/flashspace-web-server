import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";

// Partner Credentials (from seed data)
const PARTNER_EMAIL = "partner@flashspace.ai";
const PARTNER_PASSWORD = "SpacePortal@2026";

let authToken = "";
let meetingRoomId = "";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  data?: any;
}

async function runTest(
  testName: string,
  testFn: () => Promise<any>,
): Promise<TestResult> {
  try {
    console.log(`🧪 ${testName}...`);
    const result = await testFn();
    console.log(`✅ ${testName} - PASSED`);
    return { name: testName, passed: true, data: result };
  } catch (error: any) {
    console.error(`❌ ${testName} - FAILED:`, error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", JSON.stringify(error.response.data, null, 2));
    }
    return {
      name: testName,
      passed: false,
      message: error.message,
    };
  }
}

async function main() {
  console.log("🚀 TESTING MEETING ROOM MODULE");
  console.log("================================");
  console.log(`Target: ${BASE_URL}`);
  console.log(`User: ${PARTNER_EMAIL}`);

  const results: TestResult[] = [];

  // ==========================================
  // 1. AUTHENTICATION (Login as Partner)
  // ==========================================
  results.push(
    await runTest("Auth - Partner Login", async () => {
      const response = await api.post("/auth/login", {
        email: PARTNER_EMAIL,
        password: PARTNER_PASSWORD,
      });

      authToken = response.data.data.tokens.accessToken;
      if (!authToken) throw new Error("No access token received");

      console.log(
        "   Token received. User Role:",
        response.data.data.user.role,
      );
      return response.data;
    }),
  );

  const headers = { Authorization: `Bearer ${authToken}` };

  // ==========================================
  // 2. CREATE MEETING ROOM
  // ==========================================
  if (authToken) {
    results.push(
      await runTest("Meeting Room - Create", async () => {
        const payload = {
          name: `Test Board Room ${Date.now()}`,
          address: "456 Business Park, Koramangala",
          city: "Bangalore",
          area: "Koramangala",
          price: 2500, // New field
          type: "board_room", // New field
          amenities: ["Projector", "Whiteboard", "Video Conferencing"],
          coordinates: { lat: 12.9352, lng: 77.6245 },
          images: ["https://example.com/boardroom.jpg"],
        };

        const response = await api.post("/meetingRoom/create", payload, {
          headers,
        });
        meetingRoomId = response.data.data._id;
        console.log("   Created ID:", meetingRoomId);
        return response.data;
      }),
    );
  }

  // ==========================================
  // 3. GET ALL MEETING ROOMS (With Filters)
  // ==========================================
  results.push(
    await runTest("Meeting Room - Get All (Filter Type)", async () => {
      const response = await api.get("/meetingRoom/getAll?type=board_room");
      console.log("   Board Rooms found:", response.data.data.length);
      // Verify filter worked
      const allBoardRooms = response.data.data.every(
        (r: any) => r.type === "board_room",
      );
      if (!allBoardRooms)
        throw new Error("Filter failed: Returned non-board_room types");
      return response.data;
    }),
  );

  results.push(
    await runTest("Meeting Room - Get All (Filter Price)", async () => {
      // Should verify price range. Assuming we just created one at 2500.
      const response = await api.get(
        "/meetingRoom/getAll?minPrice=2000&maxPrice=3000",
      );
      console.log("   Rooms in range 2000-3000:", response.data.data.length);
      return response.data;
    }),
  );

  // ==========================================
  // 4. GET BY CITY (With Filters)
  // ==========================================
  results.push(
    await runTest('Meeting Room - Get By City "Bangalore"', async () => {
      const response = await api.get(
        "/meetingRoom/getByCity/Bangalore?type=board_room",
      );
      console.log("   Bangalore Board Rooms:", response.data.data.length);
      return response.data;
    }),
  );

  // ==========================================
  // 5. GET BY ID
  // ==========================================
  if (meetingRoomId) {
    results.push(
      await runTest("Meeting Room - Get By ID", async () => {
        const response = await api.get(`/meetingRoom/getById/${meetingRoomId}`);
        console.log("   Name:", response.data.data.name);
        console.log("   Price:", response.data.data.price);
        console.log("   Type:", response.data.data.type);
        return response.data;
      }),
    );
  }

  // ==========================================
  // 6. UPDATE MEETING ROOM
  // ==========================================
  if (meetingRoomId && authToken) {
    results.push(
      await runTest("Meeting Room - Update", async () => {
        const response = await api.put(
          `/meetingRoom/update/${meetingRoomId}`,
          {
            name: `Updated Board Room ${Date.now()}`,
            price: 3000,
          },
          { headers },
        );
        console.log("   Updated Price:", response.data.data.price);
        return response.data;
      }),
    );
  }

  // ==========================================
  // 7. GET PARTNER SPECIFIC ROOMS
  // ==========================================
  if (authToken) {
    results.push(
      await runTest("Meeting Room - Get Partner Rooms", async () => {
        const response = await api.get("/meetingRoom/partner/my-rooms", {
          headers,
        });
        console.log("   Partner Rooms:", response.data.data.length);
        return response.data;
      }),
    );
  }

  // ==========================================
  // 8. DELETE MEETING ROOM
  // ==========================================
  if (meetingRoomId && authToken) {
    results.push(
      await runTest("Meeting Room - Delete", async () => {
        const response = await api.delete(
          `/meetingRoom/delete/${meetingRoomId}`,
          { headers },
        );
        console.log("   Status:", response.data.message);
        return response.data;
      }),
    );
  }

  // SUMMARY
  console.log("\n================================");
  console.log(`TOTAL: ${results.length}`);
  console.log(`PASSED: ${results.filter((r) => r.passed).length}`);
  console.log(`FAILED: ${results.filter((r) => !r.passed).length}`);
  console.log("================================");

  if (results.some((r) => !r.passed)) process.exit(1);
}

main();
