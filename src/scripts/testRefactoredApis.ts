import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import {
  UserModel,
  UserRole,
  AuthProvider,
} from "../flashspaceWeb/authModule/models/user.model";
import { JwtUtil } from "../flashspaceWeb/authModule/utils/jwt.util";
import { VirtualOfficeService } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.service";

const BASE_URL = "http://localhost:5000/api";

const testApis = async () => {
  try {
    console.log("🌱 Connecting to Database...");
    const dbUri = process.env.DB_URI || "mongodb://localhost:27017/myapp";
    await mongoose.connect(dbUri);
    console.log("✅ Connected to Database.");

    // 1. Get/Create Partner
    const targetEmail = "partner_test@flashspace.com";
    let partner = await UserModel.findOne({ email: targetEmail });

    if (!partner) {
      partner = await UserModel.create({
        email: targetEmail,
        fullName: "API Tester",
        phoneNumber: "+91-9999999999",
        password: "hashed_password_mock",
        role: UserRole.PARTNER,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        kycVerified: true,
        isActive: true,
      });
    }

    const token = JwtUtil.generateAccessToken({
      userId: partner._id.toString(),
      email: partner.email,
      role: partner.role as any,
    });

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const callApi = async (method: string, path: string, body?: any) => {
      console.log(`\n🚀 ${method} ${path}`);
      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error(`❌ Non-JSON response:`, responseText);
        process.exit(1);
      }

      if (response.ok) {
        console.log(`✅ Success`);
        return data;
      } else {
        const errorFileName = `error_${path.replace(/[\/\.]/g, "_")}.txt`;
        console.error(
          `❌ Error (${response.status}) logged to ${errorFileName}`,
        );
        fs.writeFileSync(errorFileName, JSON.stringify(data, null, 2), "utf8");
        process.exit(1);
      }
    };

    // Direct Service test to capture true exception:
    try {
      console.log("Directly calling VirtualOfficeService...");
      await VirtualOfficeService.createOffice(
        {
          name: "Test VO",
          address: "123 Test St",
          city: "TestCity",
          area: "TestArea",
          features: ["WiFi"],
          images: ["image1.jpg"],
          gstPlanPricePerYear: 10000,
        },
        partner._id.toString(),
      );
      console.log("Direct Service Create Success!");
    } catch (err: any) {
      console.error("🔥 Direct Service Error intercepted");
      fs.writeFileSync("error.txt", err.message || JSON.stringify(err), "utf8");
      process.exit(1);
    }

    // --- TEST VIRTUAL OFFICE ---
    console.log("\n--- TESTING VIRTUAL OFFICE ---");
    let vo = await callApi("POST", "/virtualOffice/create", {
      name: "Test VO",
      address: "123 Test St",
      city: "TestCity",
      area: "TestArea",
      features: ["WiFi"],
      images: ["image1.jpg"],
      gstPlanPricePerYear: 10000,
    });

    if (vo && vo.data) {
      const voId = vo.data._id;
      await callApi("GET", `/virtualOffice/getById/${voId}`);
      await callApi("PUT", `/virtualOffice/update/${voId}`, {
        name: "Test VO Updated",
        city: "UpdatedCity",
      });
      await callApi("GET", `/virtualOffice/getByCity/UpdatedCity`);
      await callApi("DELETE", `/virtualOffice/delete/${voId}`);
    }

    // --- TEST COWORKING SPACE ---
    console.log("\n--- TESTING COWORKING SPACE ---");
    let cs = await callApi("POST", "/coworkingSpace/create", {
      name: "Test CS",
      address: "456 Test Ave",
      city: "TestCity2",
      area: "TestArea2",
      capacity: 50,
      amenities: ["Coffee"],
      images: ["image2.jpg"],
    });

    if (cs && cs.data) {
      const csId = cs.data._id;
      await callApi("GET", `/coworkingSpace/getById/${csId}`);
      await callApi("PUT", `/coworkingSpace/update/${csId}`, {
        name: "Test CS Updated",
        city: "UpdatedCity2",
      });
      await callApi("GET", `/coworkingSpace/getByCity/UpdatedCity2`);
      await callApi("DELETE", `/coworkingSpace/delete/${csId}`);
    }

    // --- TEST MEETING ROOM ---
    console.log("\n--- TESTING MEETING ROOM ---");
    let mr = await callApi("POST", "/meetingRoom/create", {
      name: "Test MR",
      address: "789 Test Blvd",
      city: "TestCity3",
      area: "TestArea3",
      capacity: 10,
      type: "other",
      images: ["image3.jpg"],
      pricePerHour: 500,
      pricePerDay: 4000,
      minBookingHours: 2,
      operatingHours: {
        openTime: "09:00",
        closeTime: "18:00",
        daysOpen: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      },
    });

    if (mr && mr.data) {
      const mrId = mr.data._id;
      await callApi("GET", `/meetingRoom/getById/${mrId}`);
      await callApi("PUT", `/meetingRoom/update/${mrId}`, {
        name: "Test MR Updated",
        city: "UpdatedCity3",
      });
      await callApi("GET", `/meetingRoom/getByCity/UpdatedCity3`);
      await callApi("DELETE", `/meetingRoom/delete/${mrId}`);
    }

    console.log("\n✨ All API tests completed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
};

testApis();
