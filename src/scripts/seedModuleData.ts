import "dotenv/config";
import mongoose from "mongoose";
import {
  UserModel,
  UserRole,
  AuthProvider,
} from "../flashspaceWeb/authModule/models/user.model";
import { JwtUtil } from "../flashspaceWeb/authModule/utils/jwt.util";

const BASE_URL = "http://localhost:5000/api";

const seedData = async () => {
  try {
    console.log("🌱 Connecting to Database...");
    const dbUri = process.env.DB_URI || "mongodb://localhost:27017/myapp";
    await mongoose.connect(dbUri);
    console.log("✅ Connected to Database.");

    // 1. Ensure/Find Partner User: partner@flashspace.com
    const targetEmail = "partner@flashspace.com";
    let partner = await UserModel.findOne({ email: targetEmail });

    if (!partner) {
      console.log(`👤 Creating partner user: ${targetEmail}...`);
      partner = await UserModel.create({
        email: targetEmail,
        fullName: "Test Partner",
        phoneNumber: "+91-9876543213",
        password:
          "$2b$12$But4Rwpe9obqCA2JsKz9nO3LaHtHAi51Ca7SJQ4Qtv0XNDE7zU1be",
        role: UserRole.PARTNER,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        kycVerified: true,
        isActive: true,
        credits: 50,
        isDeleted: false,
      });
    } else {
      console.log(`✅ Found existing partner user: ${targetEmail}`);
    }

    // 2. Generate JWT Token
    const token = JwtUtil.generateAccessToken({
      userId: partner._id.toString(),
      email: partner.email,
      role: partner.role as any,
    });
    console.log("🔑 JWT Token generated for partner.");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // 3. Helper for API calls
    const callApi = async (method: string, path: string, body: any) => {
      console.log(`🚀 Calling ${method} ${path}...`);
      try {
        const response = await fetch(`${BASE_URL}${path}`, {
          method,
          headers,
          body: JSON.stringify(body),
        });

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error(
            `❌ Non-JSON response from ${path}:`,
            responseText.substring(0, 500),
          );
          return null;
        }

        if (response.ok) {
          console.log(`✅ Success: ${path}`);
          return data;
        } else {
          console.error(
            `❌ Error ${path} (Status ${response.status}):`,
            JSON.stringify(data, null, 2),
          );
          return null;
        }
      } catch (err) {
        console.error(`🔥 Fetch failed for ${path}:`, err);
        throw err;
      }
    };

    // 4. Seed Data
    console.log("🚜 Seeding data via API for partner@flashspace.com...");

    // Space Partner - Space
    await callApi("POST", "/spacePartner/spaces", {
      name: "FlashSpace Mumbai HQ",
      address: "Andheri West",
      city: "Mumbai",
      area: "Andheri",
      location: {
        type: "Point",
        coordinates: [72.8258, 19.1176],
      },
      category: "Coworking Space",
      capacity: 100,
      amenities: ["WiFi", "Parking", "Cafeteria"],
      images: ["https://example.com/mumbai-office.jpg"],
    });

    // Space Partner - Invoice
    await callApi("POST", "/spacePartner/invoices", {
      client: "Global Tech Solutions",
      description: "Quarterly Rent - Q1 2024",
      amount: 75000,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      space: "FlashSpace Mumbai HQ",
    });

    // Space Partner - Payment
    await callApi("POST", "/spacePartner/payments", {
      client: "Global Tech Solutions",
      amount: 75000,
      method: "UPI",
      purpose: "Q1 Rent Clearance",
      space: "FlashSpace Mumbai HQ",
      date: new Date().toISOString(),
    });

    // Coworking Space
    await callApi("POST", "/coworkingSpace/create", {
      name: "Elite Coworking Mumbai",
      address: "Bandra Kurla Complex",
      city: "Mumbai",
      area: "BKC",
      capacity: 120,
      location: {
        type: "Point",
        coordinates: [72.8646, 19.0596],
      },
      pricePerMonth: 15000,
      pricePerDay: 800,
      floors: [
        {
          floorNumber: 1,
          name: "Main Floor",
          tables: [
            { tableNumber: "A", numberOfSeats: 20 },
            { tableNumber: "B", numberOfSeats: 20 },
            { tableNumber: "C", numberOfSeats: 20 },
          ],
        },
      ],
      operatingHours: {
        openTime: "08:00",
        closeTime: "22:00",
        daysOpen: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
      },
      images: ["https://example.com/coworking-bkc.jpg"],
      price: "₹800/day",
      originalPrice: "₹1,200/day",
    });

    // Meeting Room
    await callApi("POST", "/meetingRoom/create", {
      name: "Summit Room Mumbai",
      address: "BKC",
      city: "Mumbai",
      area: "BKC",
      location: {
        type: "Point",
        coordinates: [72.8646, 19.0596],
      },
      pricePerHour: 2000,
      capacity: 20,
      type: "conference_room",
      images: ["https://example.com/summit-room.jpg"],
    });

    // Virtual Office - Mumbai
    await callApi("POST", "/virtualOffice/create", {
      name: "Mumbai Virtual Pro",
      address: "Nariman Point",
      city: "Mumbai",
      area: "Nariman Point",
      location: {
        type: "Point",
        coordinates: [72.8231, 18.9256],
      },
      gstPlanPricePerYear: 15000,
      mailingPlanPricePerYear: 7500,
      features: ["GST Registration", "Mailing Services", "Call Answering"],
      images: ["https://example.com/virtual-mumbai.jpg"],
      price: "₹1,250/month",
      originalPrice: "₹2,000/month",
    });

    // Virtual Office - Delhi
    await callApi("POST", "/virtualOffice/create", {
      name: "Connaught Place Virtual",
      address: "Inner Circle, Connaught Place, New Delhi",
      city: "Delhi",
      area: "Connaught Place",
      location: {
        type: "Point",
        coordinates: [77.2167, 28.6333],
      },
      gstPlanPricePerYear: 18000,
      mailingPlanPricePerYear: 9000,
      features: ["Premium Address", "GST Registration", "Lounge Access"],
      images: ["https://example.com/virtual-delhi.jpg"],
      price: "₹1,500/month",
      originalPrice: "₹2,500/month",
    });

    // Virtual Office - Bangalore
    await callApi("POST", "/virtualOffice/create", {
      name: "Indiranagar Tech Hub Virtual",
      address: "100 Feet Road, Indiranagar, Bangalore",
      city: "Bangalore",
      area: "Indiranagar",
      location: {
        type: "Point",
        coordinates: [77.6412, 12.9716],
      },
      gstPlanPricePerYear: 14000,
      mailingPlanPricePerYear: 7000,
      features: ["Tech Startup Address", "Meeting Credits", "High Speed WiFi"],
      images: ["https://example.com/virtual-bangalore.jpg"],
      price: "₹1,150/month",
      originalPrice: "₹1,800/month",
    });

    // Virtual Office - Gurgaon
    await callApi("POST", "/virtualOffice/create", {
      name: "Cyber City Corporate Virtual",
      address: "Cyber City, DLF Phase 2, Gurgaon",
      city: "Gurgaon",
      area: "Cyber City",
      location: {
        type: "Point",
        coordinates: [77.0867, 28.495],
      },
      gstPlanPricePerYear: 20000,
      mailingPlanPricePerYear: 10000,
      features: [
        "Fortune 500 Neighborhood",
        "GST Support",
        "Receptionist Services",
      ],
      images: ["https://example.com/virtual-gurgaon.jpg"],
      price: "₹1,650/month",
      originalPrice: "₹2,800/month",
    });

    console.log("🏁 Data seeding completed for partner@flashspace.com!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedData();
