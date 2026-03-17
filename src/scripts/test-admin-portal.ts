import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";

// Credentials from seedDummyCredentials.ts
const ADMIN_EMAIL = "dummy.admin@flashspace.co";
const ADMIN_PASSWORD = "Password@123";

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

async function testAdminPortal() {
  console.log("\n👑 ADMIN PORTAL ENDPOINT TESTS");
  console.log("===============================");

  const results: TestResult[] = [];

  // 1. Login as Admin
  results.push(
    await runTest("Admin - Login", async () => {
      const response = await api.post("/auth/login", {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
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

  // 2. Dashboard Stats
  results.push(
    await runTest("Admin - Dashboard Stats", async () => {
      const response = await api.get("/admin/dashboard", { headers });
      return response.data;
    }),
  );

  // 3. Revenue Dashboard
  results.push(
    await runTest("Admin - Revenue Dashboard", async () => {
      const response = await api.get("/admin/revenue/dashboard", { headers });
      return response.data;
    }),
  );

  // 4. Leaderboard
  results.push(
    await runTest("Admin - Leaderboard", async () => {
      const response = await api.get("/admin/leaderboard", { headers });
      return response.data;
    }),
  );

  // 5. User Management
  results.push(
    await runTest("Admin - Get All Users", async () => {
      const response = await api.get("/admin/users", { headers });
      console.log(`   Found ${response.data.data?.length || 0} users`);
      return response.data;
    }),
  );

  // 6. Booking Management
  results.push(
    await runTest("Admin - Get All Bookings", async () => {
      const response = await api.get("/admin/bookings", { headers });
      console.log(`   Found ${response.data.data?.length || 0} bookings`);
      return response.data;
    }),
  );

  // 7. Client Management
  results.push(
    await runTest("Admin - Get Clients", async () => {
      const response = await api.get("/admin/clients", { headers });
      return response.data;
    }),
  );

  // 8. Pending KYC
  results.push(
    await runTest("Admin - Get Pending KYC", async () => {
      const response = await api.get("/admin/kyc/pending", { headers });
      return response.data;
    }),
  );

  // 9. Finance Invoices
  results.push(
    await runTest("Admin - Get Invoices", async () => {
      const response = await api.get("/admin/invoices", { headers });
      return response.data;
    }),
  );

  // 10. Tickets
  results.push(
    await runTest("Admin - List Tickets", async () => {
      const response = await api.get("/admin/tickets/admin/all", { headers });
      return response.data;
    }),
  );

  console.log("\n📊 TEST SUMMARY");
  console.log("===============");
  const passed = results.filter((r) => r.passed).length;
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${results.length - passed}`);

  return results;
}

testAdminPortal().catch(console.error);
