import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  UserModel,
  UserRole,
} from "../flashspaceWeb/authModule/models/user.model";
import { MeetingRoomModel } from "../flashspaceWeb/meetingRoomModule/meetingRoom.model";

// We need to mock the req and res locally to call the controller directly
import {
  getAllMeetingRooms,
  getMeetingRoomById,
  getMeetingRoomsByCity,
  getPartnerMeetingRooms,
} from "../flashspaceWeb/meetingRoomModule/meetingRoom.controller";

dotenv.config();

async function testMeetingRoomAPIs() {
  try {
    await mongoose.connect(
      process.env.DB_URI || "mongodb://localhost:27017/flashspace",
    );
    console.log("✅ Connected to DB");

    // 1. Setup Mock User
    const mockPartner = await UserModel.create({
      fullName: "Meeting Room Partner",
      email: `mrpartner_${Date.now()}@test.com`,
      phone: `+91996${Math.floor(Math.random() * 1000000)}`,
      role: UserRole.PARTNER,
      authProvider: "local",
      status: "active",
    });
    console.log("🔨 Created Test Partner");

    // Create 3 Meeting Rooms
    let testRoomId = "";
    for (let i = 0; i < 3; i++) {
      const room = await MeetingRoomModel.create({
        name: `Test Room ${i}`,
        address: `Test Address ${i}`,
        city: "TestCity",
        area: "TestArea",
        location: { type: "Point", coordinates: [0, 0] },
        pricePerHour: 100,
        partnerPricePerHour: 100,
        capacity: 10,
        partner: mockPartner._id,
        property: new mongoose.Types.ObjectId(),
        type: "meeting_room",
        images: ["test.jpg"],
        operatingHours: {
          openTime: "09:00",
          closeTime: "18:00",
          daysOpen: ["Monday"],
        },
        approvalStatus: "pending_kyc",
      });
      if (i === 0) testRoomId = room._id.toString();
    }

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

    // 2. Test getAllMeetingRooms (with huge limit to trigger Math.min)
    const req1 = { query: { limit: "50000" } } as any;
    const res1 = mockRes();
    await getAllMeetingRooms(req1, res1);

    // We expect the array returned to be successfully bound by _limit,
    // though our test subset is only 3 rooms anyway. The schema max enforces success.
    if (res1.statusCode === 400 && !res1.body.success) {
      console.log("✅ API: getAllMeetingRooms (Zod DoS Blocked) - PASS");
    } else {
      // Wait, because we cap it gracefully via safeParse it should return 400 if limit > 100
      console.error("❌ API: getAllMeetingRooms - FAIL", res1.body);
    }

    // 3. Test getMeetingRoomsByCity (Valid)
    const req2 = {
      params: { city: "TestCity" },
      query: { limit: "10" },
    } as any;
    const res2 = mockRes();
    await getMeetingRoomsByCity(req2, res2);

    if (res2.statusCode === 200 && res2.body.success) {
      console.log("✅ API: getMeetingRoomsByCity (Valid) - PASS");
    } else {
      console.error("❌ API: getMeetingRoomsByCity - FAIL", res2.body);
    }

    // 4. Test getMeetingRoomById Valid Case
    const req3 = { params: { meetingRoomId: testRoomId } } as any;
    const res3 = mockRes();
    await getMeetingRoomById(req3, res3);

    if (res3.statusCode === 200 && res3.body.success) {
      console.log("✅ API: getMeetingRoomById (Valid ObjectId) - PASS");
    } else {
      console.error("❌ API: getMeetingRoomById - FAIL", res3.body);
    }

    // 5. Test getMeetingRoomById Invalid ObjectId
    const req4 = {
      params: { meetingRoomId: "hackertryingtocrashtheserver123" },
    } as any;
    const res4 = mockRes();
    await getMeetingRoomById(req4, res4);

    if (res4.statusCode === 400 && !res4.body.success) {
      console.log("✅ API: getMeetingRoomById (ObjectId Crash Blocked) - PASS");
    } else {
      console.error("❌ API: getMeetingRoomById - FAIL", res4.body);
    }
  } catch (error) {
    console.error("💥 Integration Test Error:", error);
  } finally {
    console.log("🧹 Cleaning up...");
    // Cleanup everything matching email prefix
    await UserModel.deleteMany({ email: { $regex: "^mrpartner_" } });
    await MeetingRoomModel.deleteMany({ city: "TestCity" });
    await mongoose.disconnect();
    console.log("✅ Disconnected & Done");
  }
}

testMeetingRoomAPIs();
