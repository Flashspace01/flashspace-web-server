import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  PaymentModel,
  PaymentStatus,
} from "../flashspaceWeb/paymentModule/payment.model";

dotenv.config();
// Set Mock Razorpay Key
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "mock_key";

import {
  getUserPayments,
  createOrder,
} from "../flashspaceWeb/paymentModule/payment.controller";

async function testPaymentAPIs() {
  try {
    await mongoose.connect(
      process.env.DB_URI || "mongodb://localhost:27017/flashspace",
    );
    console.log("✅ Connected to DB");

    const mockUserId = new mongoose.Types.ObjectId();
    const mockSpaceId = new mongoose.Types.ObjectId();

    // Mock Express Response
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

    console.log("-----------------------------------------");
    console.log("🧪 Test 1: Zod Rejects Missing Fields in createOrder");
    const req1 = {
      body: {
        userId: mockUserId.toString(),
        // missing userEmail, spaceId, etc.
      },
    } as any;
    const res1 = mockRes();
    await createOrder(req1, res1);

    if (res1.statusCode === 400 && !res1.body.success) {
      console.log("✅ API: createOrder (Zod Catch Missing Fields) - PASS");
    } else {
      console.error("❌ API: createOrder - FAIL", res1.body);
    }

    console.log("-----------------------------------------");
    console.log("🧪 Test 2: Unbounded Pagination Limit Trapped");
    // We request 500 records on pagination. Zod Schema Math.min(limit, 100) should cut it to 100 or Zod kicks it
    const req2 = {
      params: { userId: mockUserId.toString() },
      query: { limit: "5000" },
    } as any;
    const res2 = mockRes();
    await getUserPayments(req2, res2);

    if (res2.statusCode === 400 && !res2.body.success) {
      console.log(
        "✅ API: getUserPayments (Zod Limits Catch DoS Vector) - PASS",
      );
    } else {
      console.error("❌ API: getUserPayments Limits Fail", res2.body);
    }

    console.log("-----------------------------------------");
    console.log("🧪 Test 3: ObjectId Check Traps CastErrors");
    const req3 = {
      params: {
        userId: "im_a_hacker_trying_to_crash_the_server_with_a_cast_error",
      },
      query: { limit: "10" },
    } as any;
    const res3 = mockRes();
    await getUserPayments(req3, res3);

    if (res3.statusCode === 400 && !res3.body.success) {
      console.log("✅ API: getUserPayments (Zod CastError Protection) - PASS");
    } else {
      console.error("❌ API: getUserPayments ObjectId Fail", res3.body);
    }
  } catch (err) {
    console.error("Test Error", err);
  } finally {
    await mongoose.disconnect();
    console.log("🧹 DB Disconnected");
  }
}

testPaymentAPIs();
