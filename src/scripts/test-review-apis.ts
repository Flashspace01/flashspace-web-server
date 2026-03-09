import mongoose from "mongoose";
import dotenv from "dotenv";
import { getSpaceReviews } from "../flashspaceWeb/reviewsModule/review.controller";

dotenv.config();

async function testReviewAPIs() {
  try {
    await mongoose.connect(
      process.env.DB_URI || "mongodb://localhost:27017/flashspace",
    );
    console.log("✅ Connected to DB");

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
    console.log("🧪 Test 1: Unbounded Pagination Limit Trapped");
    const req1 = {
      params: { spaceId: mockSpaceId.toString() },
      query: { limit: "500" },
    } as any;
    const res1 = mockRes();
    await getSpaceReviews(req1, res1);

    if (res1.statusCode === 400 && !res1.body.success) {
      console.log(
        "✅ API: getSpaceReviews (Zod Limits Catch DoS Vector) - PASS",
      );
    } else {
      console.error("❌ API: getSpaceReviews Limits Fail", res1.body);
    }

    console.log("-----------------------------------------");
    console.log("🧪 Test 2: ObjectId Check Traps CastErrors");
    const req2 = {
      params: { spaceId: "hacker_invalid_id" },
      query: { limit: "10" },
    } as any;
    const res2 = mockRes();
    await getSpaceReviews(req2, res2);

    if (res2.statusCode === 400 && !res2.body.success) {
      console.log("✅ API: getSpaceReviews (Zod CastError Protection) - PASS");
    } else {
      console.error("❌ API: getSpaceReviews ObjectId Fail", res2.body);
    }

    console.log("-----------------------------------------");
    console.log("🧪 Test 3: Valid Request Fetches Reviews Safely");
    const req3 = {
      params: { spaceId: mockSpaceId.toString() },
      query: { limit: "20" }, // under 100 limit
    } as any;
    const res3 = mockRes();
    await getSpaceReviews(req3, res3);

    if (res3.statusCode === 200 && res3.body.success) {
      console.log(
        "✅ API: getSpaceReviews (Valid Payload Succeeds) - PASS",
        res3.body.data.limit,
      );
    } else {
      console.error("❌ API: getSpaceReviews Valid Request Fail", res3.body);
    }
  } catch (err) {
    console.error("Test Error", err);
  } finally {
    await mongoose.disconnect();
    console.log("🧹 DB Disconnected");
  }
}

testReviewAPIs();
