import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";

// Credentials from seedDummyCredentials.ts
const AFFILIATE_EMAIL = "dummy.affiliate@flashspace.co";
const AFFILIATE_PASSWORD = "Password@123";

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

async function testAffiliatePortal() {
  console.log("\n🤝 AFFILIATE PORTAL ENDPOINT TESTS");
  console.log("===================================");

  const results: TestResult[] = [];

  // 1. Login as Affiliate
  results.push(
    await runTest("Affiliate - Login", async () => {
      const response = await api.post("/auth/login", {
        email: AFFILIATE_EMAIL,
        password: AFFILIATE_PASSWORD,
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

  // 2. Quotations
  results.push(
    await runTest("Affiliate - Get Quotations", async () => {
      const response = await api.get("/affiliate/quotations", { headers });
      console.log(`   Found ${response.data.data?.length || 0} quotations`);
      return response.data;
    }),
  );

  // 3. Leads
  results.push(
    await runTest("Affiliate - Get Leads", async () => {
      const response = await api.get("/affiliate/leads", { headers });
      console.log(`   Found ${response.data.data?.length || 0} leads`);
      return response.data;
    }),
  );

  // 4. Leaderboard
  results.push(
    await runTest("Affiliate - Get Leaderboard", async () => {
      const response = await api.get("/affiliate/leaderboard", { headers });
      return response.data;
    }),
  );

  // 5. Dashboard Stats
  results.push(
    await runTest("Affiliate - Get Dashboard Stats", async () => {
      const response = await api.get("/affiliate/dashboard/stats", { headers });
      return response.data;
    }),
  );

  // 6. Clients
  results.push(
    await runTest("Affiliate - Get My Clients", async () => {
      const response = await api.get("/affiliate/clients", { headers });
      return response.data;
    }),
  );

  // 7. Invoices
  results.push(
    await runTest("Affiliate - Get Invoices", async () => {
      const response = await api.get("/affiliate/invoices", { headers });
      return response.data;
    }),
  );

  console.log("\n📊 TEST SUMMARY");
  console.log("===============");
  const passed = results.filter((r) => r.passed).length;
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${results.length - passed}`);

  return results;
}

testAffiliatePortal().catch(console.error);
