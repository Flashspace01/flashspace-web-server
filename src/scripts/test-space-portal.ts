import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";

// Credentials from seedDummyCredentials.ts
const PARTNER_EMAIL = "dummy.partner@flashspace.co";
const PARTNER_PASSWORD = "Password@123";

let authToken = "";

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
    const errorMsg = error.response?.data?.message || error.message || "Unknown error";
    console.error(`❌ ${testName} - FAILED:`, errorMsg);
    if (error.response?.data) {
      console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error("No response received from server. Is it running at " + BASE_URL + "?");
    }
    return {
      name: testName,
      passed: false,
      message: errorMsg,
    };
  }
}

async function testSpacePortal() {
  console.log("\n🚀 SPACE PORTAL (PARTNER) ENDPOINT TESTS");
  console.log("=========================================");

  const results: TestResult[] = [];

  // 1. Login as Partner
  results.push(
    await runTest("Partner - Login", async () => {
      const response = await api.post("/auth/login", {
        email: PARTNER_EMAIL,
        password: PARTNER_PASSWORD,
      });

      authToken = response.data.data.tokens.accessToken;
      console.log("   Login successful, token received");
      return response.data;
    }),
  );

  if (!authToken) {
    console.error("❌ Authentication failed. Skipping remaining tests.");
    return results;
  }

  const headers = { Authorization: `Bearer ${authToken}` };

  // 2. Get Space Details
  results.push(
    await runTest("Partner - Get Space Details", async () => {
      const response = await api.get("/spacePartner/space-details", { headers });
      return response.data;
    }),
  );

  // 3. Get Spaces
  results.push(
    await runTest("Partner - Get All Spaces", async () => {
      const response = await api.get("/spacePartner/spaces", { headers });
      console.log(`   Found ${response.data.data?.length || 0} spaces`);
      return response.data;
    }),
  );

  // 4. Get Financial Invoices
  results.push(
    await runTest("Partner - Get Invoices", async () => {
      const response = await api.get("/spacePartner/invoices", { headers });
      return response.data;
    }),
  );

  // 5. Get Financial Payments
  results.push(
    await runTest("Partner - Get Payments", async () => {
      const response = await api.get("/spacePartner/payments", { headers });
      return response.data;
    }),
  );

  // 6. Get Own KYC
  results.push(
    await runTest("Partner - Get KYC Status", async () => {
      const response = await api.get("/spacePartner/kyc", { headers });
      return response.data;
    }),
  );

  console.log("\n📊 TEST SUMMARY");
  console.log("===============");
  const passed = results.filter((r) => r.passed).length;
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${results.length - passed}`);

  return results;
}

testSpacePortal().catch(console.error);
