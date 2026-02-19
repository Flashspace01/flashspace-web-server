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
let virtualOfficeId = "";

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
  console.log("🚀 TESTING VIRTUAL OFFICE MODULE");
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
  // 2. CREATE VIRTUAL OFFICE
  // ==========================================
  if (authToken) {
    results.push(
      await runTest("Virtual Office - Create", async () => {
        // Note: Typically only Partners/Admins should create spaces, but check controller logic
        // The current controller api/virtualOffice/create seems public or doesn't check role explicitly in the route definition?
        // Looking at route: router.post('/create', createVirtualOffice); -> It's PUBLIC in routes file!
        // This might be a security issue to note, but for now we test functionality.

        const payload = {
          name: `Test Office ${Date.now()}`,
          address: "123 Innovation Dr, Tech Park",
          city: "Bangalore",
          area: "Electronic City",
          gstPlanPrice: "1000",
          mailingPlanPrice: "500",
          brPlanPrice: "1500",
          // Legacy fields required by current running server (schema mismatch)
          price: "1000",
          originalPrice: "1500",
          rating: 4.5,
          reviews: 0,
          features: ["Mail Handling", "GST Registration"],
          availability: "Available",
          popular: true,
          coordinates: { lat: 12.9716, lng: 77.5946 },
          images: ["https://example.com/office.jpg"],
          isSponsored: false,
        };

        const response = await api.post("/virtualOffice/create", payload, {
          headers,
        });
        virtualOfficeId = response.data.data._id;
        console.log("   Created ID:", virtualOfficeId);
        return response.data;
      }),
    );
  }

  // ==========================================
  // 3. GET ALL VIRTUAL OFFICES
  // ==========================================
  results.push(
    await runTest("Virtual Office - Get All", async () => {
      const response = await api.get("/virtualOffice/getAll");
      console.log("   Count:", response.data.data.length);
      return response.data;
    }),
  );

  // ==========================================
  // 4. GET BY CITY
  // ==========================================
  results.push(
    await runTest('Virtual Office - Get By City "Bangalore"', async () => {
      const response = await api.get("/virtualOffice/getByCity/Bangalore");
      console.log("   Found:", response.data.data.length);
      return response.data;
    }),
  );

  // ==========================================
  // 5. GET BY ID
  // ==========================================
  if (virtualOfficeId) {
    results.push(
      await runTest("Virtual Office - Get By ID", async () => {
        const response = await api.get(
          `/virtualOffice/getById/${virtualOfficeId}`,
        );
        console.log("   Name:", response.data.data.name);
        return response.data;
      }),
    );
  }

  // ==========================================
  // 6. UPDATE VIRTUAL OFFICE
  // ==========================================
  if (virtualOfficeId && authToken) {
    results.push(
      await runTest("Virtual Office - Update", async () => {
        const response = await api.put(
          `/virtualOffice/update/${virtualOfficeId}`,
          {
            name: `Updated Office ${Date.now()}`,
            gstPlanPrice: 1200,
          },
          { headers },
        );
        console.log("   Updated Name:", response.data.data.name);
        return response.data;
      }),
    );
  }

  // ==========================================
  // 7. GET PARTNER SPECIFIC OFFICES (Protected)
  // ==========================================
  if (authToken) {
    results.push(
      await runTest("Virtual Office - Get Partner Spaces", async () => {
        // This endpoint filters by the logged-in user's ID
        const response = await api.get("/virtualOffice/partner/spaces", {
          headers,
        });
        console.log("   Partner Spaces:", response.data.data.length);

        // Note: The /create endpoint used earlier might NOT have assigned the creator as partner
        // because the controller doesn't seem to extract userId from req.user for public routes.
        // If the list is empty, it confirms that /create didn't link the user.
        // We will log this observation.
        if (response.data.data.length === 0) {
          console.log(
            '   ⚠️ No spaces found for partner. This suggests the "Create" endpoint does not link the creation to the user, or the "Create" endpoint is public and anonymous.',
          );
        }
        return response.data;
      }),
    );
  }

  // ==========================================
  // 8. DELETE VIRTUAL OFFICE
  // ==========================================
  if (virtualOfficeId && authToken) {
    results.push(
      await runTest("Virtual Office - Delete", async () => {
        const response = await api.delete(
          `/virtualOffice/delete/${virtualOfficeId}`,
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
