import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { dbConnection } from "../config/db.config";

// Models
import { UserModel } from "../flashspaceWeb/authModule/models/user.model";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import { MeetingRoomModel } from "../flashspaceWeb/meetingRoomModule/meetingRoom.model";
import { BookingModel } from "../flashspaceWeb/bookingModule/booking.model";
import { InvoiceModel } from "../flashspaceWeb/invoiceModule/invoice.model";
import {
  PaymentModel,
  PaymentStatus,
  PaymentType,
} from "../flashspaceWeb/paymentModule/payment.model";
import { ReviewModel } from "../flashspaceWeb/reviewsModule/review.model";
import {
  CreditLedgerModel,
  CreditType,
} from "../flashspaceWeb/creditLedgerModule/creditLedger.model";
import { SupportTicketModel } from "../flashspaceWeb/userDashboardModule/models/supportTicket.model";
import { KYCDocumentModel } from "../flashspaceWeb/userDashboardModule/models/kyc.model";

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const runSeed = async () => {
  try {
    console.log("🌱 Connecting to database...");
    await dbConnection();

    console.log("💥 Dropping existing database...");
    await mongoose.connection.db.dropDatabase();
    console.log("✅ Database dropped.");

    console.log("🔨 Seeding Users...");
    const passwordHash = await hashPassword("Password123!");

    const adminUser = await UserModel.create({
      fullName: "Admin Flashspace",
      email: "admin@flashspace.example.com",
      password: passwordHash,
      role: "admin",
      isEmailVerified: true,
      provider: "local",
    });

    const partnerUser = await UserModel.create({
      fullName: "Partner Flashspace",
      email: "partner@flashspace.example.com",
      password: passwordHash,
      role: "partner", // space_partner based on some systems
      isEmailVerified: true,
      provider: "local",
    });

    const standardUser = await UserModel.create({
      fullName: "Standard User Flashspace",
      email: "user@flashspace.example.com",
      password: passwordHash,
      role: "user",
      isEmailVerified: true,
      provider: "local",
      credits: 6000,
    });

    // Create a Partner KYC
    await KYCDocumentModel.create({
      user: partnerUser._id,
      kycType: "individual",
      profileName: "Partner Profile",
      personalInfo: {
        fullName: partnerUser.fullName,
        email: partnerUser.email,
        phone: "1234567890",
        panNumber: "ABCDE1234F",
        aadhaarNumber: "123456789012",
      },
      overallStatus: "approved",
      progress: 100,
      documents: [],
    });

    // Create a User KYC
    const userKyc = await KYCDocumentModel.create({
      user: standardUser._id,
      kycType: "individual",
      profileName: "User Profile",
      personalInfo: {
        fullName: standardUser.fullName,
        email: standardUser.email,
        phone: "0987654321",
        panNumber: "QWERT1234F",
        aadhaarNumber: "987654321012",
      },
      overallStatus: "approved",
      progress: 100,
      documents: [],
    });

    console.log("🔨 Seeding Properties...");
    const property = await PropertyModel.create({
      name: "Global Tech Hub",
      partner: partnerUser._id,
      address: "100 Innovation Drive",
      city: "Bangalore",
      area: "Whitefield",
      location: {
        type: "Point",
        coordinates: [77.6411, 12.9718],
      },
      amenities: ["WiFi", "AC", "Cafeteria", "Parking"],
      images: ["https://example.com/prop1.jpg"],
      status: "active",
    });

    console.log("🔨 Seeding Spaces...");
    const coworkingSpace = await CoworkingSpaceModel.create({
      partner: partnerUser._id,
      property: property._id,
      capacity: 100,
      partnerPricePerMonth: 4000,
      adminMarkupPerMonth: 1000,
      finalPricePerMonth: 5000,
      isActive: true,
      inventory: [
        {
          type: "DEDICATED_DESK",
          totalUnits: 20,
          availableUnits: 15,
          pricePerMonth: 5000,
        },
        {
          type: "HOT_DESK",
          totalUnits: 50,
          availableUnits: 50,
          pricePerMonth: 4000,
        },
      ],
      floors: [
        {
          floorNumber: 1,
          name: "Ground Floor",
          tables: [{ tableNumber: "T1", numberOfSeats: 10 }],
        },
      ],
      operatingHours: {
        openTime: "08:00",
        closeTime: "20:00",
        daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      },
      avgRating: 4.5,
      totalReviews: 12,
    });

    const virtualOffice = await VirtualOfficeModel.create({
      partner: partnerUser._id,
      property: property._id,
      isActive: true,
      plans: [
        {
          name: "Business Address",
          price: 1000,
          validityOptions: [{ tenure: 12, unit: "months", price: 10000 }],
        },
        {
          name: "Premium Virtual",
          price: 2000,
          validityOptions: [{ tenure: 12, unit: "months", price: 20000 }],
        },
      ],
    });

    const meetingRoom = await MeetingRoomModel.create({
      partner: partnerUser._id,
      property: property._id,
      capacity: 10,
      type: "meeting_room",
      partnerPricePerHour: 400,
      adminMarkupPerHour: 100,
      finalPricePerHour: 500,
      isActive: true,
      amenities: ["Projector", "Whiteboard", "TV"],
      images: ["https://example.com/mr1.jpg"],
      operatingHours: {
        openTime: "08:00",
        closeTime: "20:00",
        daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      },
    });

    console.log("🔨 Seeding Payments, Bookings & Invoices...");

    // Virtual Office Payment & Booking
    const voOrderMockId = `order_vo_${Date.now()}`;
    const voPayment = await PaymentModel.create({
      userId: standardUser._id,
      userEmail: standardUser.email,
      userName: standardUser.fullName,
      razorpayOrderId: voOrderMockId,
      razorpayPaymentId: `pay_vo_${Date.now()}`,
      razorpaySignature: "mock_signature",
      spaceId: virtualOffice._id,
      spaceName: property.name + " (Virtual Office)",
      planName: "Business Address",
      planKey: "business_address_12_months",
      tenure: 12,
      yearlyPrice: 10000,
      amount: 1180000,
      totalAmount: 11800, // 10000 + 18% GST = 11800
      status: PaymentStatus.COMPLETED,
      paymentType: PaymentType.VIRTUAL_OFFICE,
    });

    const voBooking = await BookingModel.create({
      bookingNumber: `FS-VO-${Date.now()}`,
      user: standardUser._id,
      partnerId: partnerUser._id,
      type: "virtual_office",
      status: "active",
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      spaceId: virtualOffice._id,
      spaceSnapshot: {
        name: property.name,
        propertyId: property._id.toString(),
      },
      plan: {
        name: "Business Address",
        price: 10000,
        tenure: 12,
        tenureUnit: "months",
      },
      paymentId: voPayment._id,
      kycProfileId: userKyc._id.toString(),
      kycStatus: "approved",
      amountPaid: 11800,
    });

    await InvoiceModel.create({
      invoiceNumber: `INV-VO-${Date.now()}`,
      user: standardUser._id,
      partnerId: partnerUser._id,
      bookingId: voBooking._id,
      paymentId: voPayment._id,
      description: "Virtual Office Booking Invoice",
      subtotal: 10000,
      total: 11800,
      status: "paid",
      pdfUrl: "https://example.com/invoice_vo.pdf",
    });

    console.log("🔨 Seeding Credits Ledger...");
    // Credit ledger initial state
    await CreditLedgerModel.create({
      user: standardUser._id,
      amount: 6000,
      type: CreditType.EARNED, // assuming String works for Enum based on previous fixes
      description: "Initial Bonus Credits",
      balanceAfter: 6000,
    });

    console.log("🔨 Seeding Reviews...");
    await ReviewModel.create({
      user: standardUser._id,
      space: coworkingSpace._id,
      spaceModel: "CoworkingSpace",
      rating: 5,
      comment: "Amazing place to work! Great vibes.",
    });

    await ReviewModel.create({
      user: standardUser._id,
      space: meetingRoom._id,
      spaceModel: "MeetingRoom",
      rating: 4,
      comment: "Good projector, but AC was a bit loud.",
    });

    console.log("🔨 Seeding Support Tickets...");
    const ticket = await SupportTicketModel.create({
      ticketNumber: `TKT-${new Date().getFullYear()}-00001`,
      user: standardUser._id,
      bookingId: voBooking._id.toString(),
      subject: "WiFi Issue",
      category: "technical",
      priority: "high",
      status: "open",
      messages: [
        {
          sender: "user",
          senderName: standardUser.fullName,
          senderId: standardUser._id,
          message: "The WiFi speed is extremely slow today.",
          createdAt: new Date(),
        },
      ],
    });

    console.log(`\n🎉 SEED COMPLETE!`);
    console.log(
      `Partner Account: partner@flashspace.example.com / Password123!`,
    );
    console.log(`User Account:    user@flashspace.example.com / Password123!`);
    console.log(`Admin Account:   admin@flashspace.example.com / Password123!`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Failed:", error);
    process.exit(1);
  }
};

runSeed();
