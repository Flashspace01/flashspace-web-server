import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  UserModel,
  UserRole,
} from "../flashspaceWeb/authModule/models/user.model";
import {
  CreditLedgerModel,
  CreditType,
} from "../flashspaceWeb/creditLedgerModule/creditLedger.model";
import { BookingModel } from "../flashspaceWeb/bookingModule/booking.model";

// We need to mock the req and res locally to call the controller directly
import {
  getCredits,
  redeemReward,
} from "../flashspaceWeb/userDashboardModule/controllers/userDashboard.controller";

dotenv.config();

async function testCreditLedgerAPIs() {
  try {
    await mongoose.connect(
      process.env.DB_URI || "mongodb://localhost:27017/flashspace",
    );
    console.log("✅ Connected to DB");

    // 1. Setup Mock User
    const mockDbUser = await UserModel.create({
      fullName: "Credit Test User",
      email: `credittest_${Date.now()}@example.com`,
      phone: `+91999${Math.floor(Math.random() * 1000000)}`,
      role: UserRole.USER,
      authProvider: "local",
      status: "active",
      credits: 6000, // Sufficient for a 5000 point reward
    });
    const userId = mockDbUser._id.toString();
    console.log("🔨 Created Test User with 6000 Credits");

    // Create an initial Earned ledger entry
    await CreditLedgerModel.create({
      user: userId,
      amount: 6000,
      type: CreditType.EARNED,
      description: "Initial Test Credits",
      balanceAfter: 6000,
      remainingAmount: 6000,
    });

    // MOCK RESPONSE OBJECT
    const mockRes = () => {
      const res: any = {};
      res.status = (code: number) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data: any) => {
        res.body = data;
        return res;
      };
      return res;
    };

    // 2. Test getCredits
    const req1 = { user: { id: userId }, query: { limit: "5" } } as any;
    const res1 = mockRes();
    await getCredits(req1, res1);

    if (
      res1.statusCode === 200 &&
      res1.body.success &&
      res1.body.data.history.length > 0
    ) {
      console.log("✅ API: getCredits - PASS");
    } else {
      console.error("❌ API: getCredits - FAIL", res1.body);
    }

    // 3. Test redeemReward (Success Scenario)
    console.log("🔨 Testing redeemReward (Success Path)...");
    const req2 = {
      user: { id: userId },
      body: {
        spaceName: "Test Meeting",
        date: new Date().toISOString(),
      },
    } as any;
    const res2 = mockRes();
    await redeemReward(req2, res2);

    if (res2.statusCode === 200 && res2.body.success) {
      console.log("✅ API: redeemReward (Success) - PASS");
    } else {
      console.error("❌ API: redeemReward (Success) - FAIL", res2.body);
    }

    // 4. Test redeemReward (Insufficient Funds / Double Spend Attack)
    console.log(
      "🔨 Testing redeemReward (Failure Path - Insufficient Funds)...",
    );
    const req3 = {
      user: { id: userId },
      body: { spaceName: "Hacker Meeting" },
    } as any;
    const res3 = mockRes();
    await redeemReward(req3, res3);

    if (res3.statusCode === 400 && !res3.body.success) {
      console.log("✅ API: redeemReward (Insufficient Funds Blocked) - PASS");
    } else {
      console.error(
        "❌ API: redeemReward (Insufficient Funds) - FAIL",
        res3.body,
      );
    }
  } catch (error) {
    console.error("💥 Integration Test Error:", error);
  } finally {
    console.log("🧹 Cleaning up...");
    // Cleanup everything matching email prefix
    await UserModel.deleteMany({ email: { $regex: "^credittest_" } });
    await mongoose.disconnect();
    console.log("✅ Disconnected & Done");
  }
}

testCreditLedgerAPIs();
