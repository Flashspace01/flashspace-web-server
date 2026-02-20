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
let eventSpaceId = "";

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
  console.log("🚀 TESTING EVENT SPACE MODULE");
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
  // 2. CREATE EVENT SPACE (Conference Hall)
  // ==========================================
  if (authToken) {
    results.push(
      await runTest("Event Space - Create (Conference Hall)", async () => {
        const payload = {
          name: `Grand Conference Center ${Date.now()}`,
          address: "123 Tech Park, Whitefield",
          city: "Bangalore",
          area: "Whitefield",
          pricePerHour: 15000,
          type: "conference_hall",
          capacity: 200,
          amenities: ["Stage", "Sound System", "Projector", "WiFi"],
          coordinates: { lat: 12.9698, lng: 77.75 },
          images: ["https://example.com/conference.jpg"],
        };

        const response = await api.post("/eventSpace/create", payload, {
          headers,
        });
        eventSpaceId = response.data.data._id;
        console.log("   Created ID:", eventSpaceId);
        return response.data;
      }),
    );
  }

  // ==========================================
  // 3. CREATE EVENT SPACE (Other)
  // ==========================================
  if (authToken) {
    results.push(
      await runTest("Event Space - Create (Other)", async () => {
        const payload = {
          name: `Startup Launchpad ${Date.now()}`,
          address: "789 Innovation Hub, Koramangala",
          city: "Bangalore",
          area: "Koramangala",
          pricePerHour: 5000,
          type: "other",
          customType: "Outdoor Amphitheater",
          amenities: ["Open Air", "Lighting", "Seating"],
          coordinates: { lat: 12.9352, lng: 77.6245 },
          images: ["https://example.com/amphi.jpg"],
        };

        const response = await api.post("/eventSpace/create", payload, {
          headers,
        });
        console.log("   Created Other ID:", response.data.data._id);
        return response.data;
      }),
    );
  }

  // ==========================================
  // 4. GET ALL EVENT SPACES (Filter Type)
  // ==========================================
  results.push(
    await runTest("Event Space - Get All (Filter Type)", async () => {
      const response = await api.get("/eventSpace/getAll?type=conference_hall");
      console.log("   Conference Halls found:", response.data.data.length);
      const allCorrect = response.data.data.every(
        (r: any) => r.type === "conference_hall",
      );
      if (!allCorrect) throw new Error("Filter failed: Returned wrong types");
      return response.data;
    }),
  );

  // ==========================================
  // 5. GET BY CITY (With Filters)
  // ==========================================
  results.push(
    await runTest('Event Space - Get By City "Bangalore"', async () => {
      const response = await api.get(
        "/eventSpace/getByCity/Bangalore?type=conference_hall",
      );
      console.log("   Bangalore Conference Halls:", response.data.data.length);
      return response.data;
    }),
  );

  // ==========================================
  // 6. GET BY ID
  // ==========================================
  if (eventSpaceId) {
    results.push(
      await runTest("Event Space - Get By ID", async () => {
        const response = await api.get(`/eventSpace/getById/${eventSpaceId}`);
        console.log("   Name:", response.data.data.name);
        console.log("   Type:", response.data.data.type);
        return response.data;
      }),
    );
  }

  // ==========================================
  // 7. UPDATE EVENT SPACE
  // ==========================================
  if (eventSpaceId && authToken) {
    results.push(
      await runTest("Event Space - Update", async () => {
        const response = await api.put(
          `/eventSpace/update/${eventSpaceId}`,
          {
            name: `Updated Conference Center ${Date.now()}`,
            pricePerHour: 18000,
          },
          { headers },
        );
        console.log("   Updated Price:", response.data.data.pricePerHour);
        return response.data;
      }),
    );
  }

  // ==========================================
  // 8. GET PARTNER EVENT SPACES
  // ==========================================
  if (authToken) {
    results.push(
      await runTest("Event Space - Get Partner Spaces", async () => {
        const response = await api.get("/eventSpace/partner/my-spaces", {
          headers,
        });
        console.log("   Partner Spaces:", response.data.data.length);
        return response.data;
      }),
    );
  }

  // ==========================================
  // 9. DELETE EVENT SPACE
  // ==========================================
  if (eventSpaceId && authToken) {
    results.push(
      await runTest("Event Space - Delete", async () => {
        const response = await api.delete(
          `/eventSpace/delete/${eventSpaceId}`,
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
