import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  getUserBookings,
  getAvailability,
} from "../flashspaceWeb/seatingModule/seating.controller";

dotenv.config();

async function testSeatingAPIs() {
  try {
    await mongoose.connect(
      process.env.DB_URI || "mongodb://localhost:27017/flashspace",
    );
    console.log("✅ Connected to DB");

    const mockSpaceId = new mongoose.Types.ObjectId();
    const mockUserId = new mongoose.Types.ObjectId();

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
    console.log("🧪 Test 1: Unbounded Pagination Limit Trapped");
    const req1 = {
      user: { id: mockUserId.toString() },
      query: { limit: "5000" },
    } as any;
    const res1 = mockRes();
    await getUserBookings(req1, res1);

    if (res1.statusCode === 400 && !res1.body.success) {
      console.log(
        "✅ API: getUserBookings (Zod Limits Catch DoS Vector) - PASS",
      );
    } else {
      console.error("❌ API: getUserBookings Limits Fail", res1.body);
    }

    console.log("-----------------------------------------");
    console.log("🧪 Test 2: ObjectId Check Traps CastErrors (Availability)");
    const req2 = {
      params: { spaceId: "hacker_invalid_id_format" },
      query: { start: new Date().toISOString(), end: new Date().toISOString() },
    } as any;
    const res2 = mockRes();
    await getAvailability(req2, res2);

    if (res2.statusCode === 400 && !res2.body.success) {
      console.log("✅ API: getAvailability (Zod CastError Protection) - PASS");
    } else {
      console.error("❌ API: getAvailability ObjectId Fail", res2.body);
    }

    console.log("-----------------------------------------");
    console.log(
      "🧪 Test 3: Valid Request Fetches Availability (Catches on Missing DB Entry)",
    );
    const req3 = {
      params: { spaceId: mockSpaceId.toString() },
      query: { start: new Date().toISOString(), end: new Date().toISOString() },
    } as any;
    const res3 = mockRes();
    await getAvailability(req3, res3);

    // It passes validation but fails on DB because mockSpaceId doesn't exist. That's a successful block.
    if (
      res3.statusCode === 404 &&
      !res3.body.success &&
      res3.body.message === "Space not found"
    ) {
      console.log(
        "✅ API: getAvailability (Valid Payload Checked DB Properly) - PASS",
      );
    } else {
      console.error("❌ API: getAvailability DB Query Fail", res3.body);
    }
  } catch (err) {
    console.error("Test Error", err);
  } finally {
    await mongoose.disconnect();
    console.log("🧹 DB Disconnected");
  }
}

testSeatingAPIs();
