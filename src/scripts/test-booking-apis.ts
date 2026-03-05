import mongoose from "mongoose";
import dotenv from "dotenv";
import { BookingModel } from "../flashspaceWeb/bookingModule/booking.model";
import {
  UserModel,
  UserRole,
} from "../flashspaceWeb/authModule/models/user.model";
import { BookingService } from "../flashspaceWeb/bookingModule/booking.service";
import { KYCDocumentModel } from "../flashspaceWeb/userDashboardModule/models/kyc.model";

dotenv.config();

async function testBookingAPIs() {
  try {
    await mongoose.connect(
      process.env.DB_URI || "mongodb://localhost:27017/flashspace",
    );
    console.log("✅ Connected to DB");

    // 1. Setup Data
    const user = await UserModel.create({
      fullName: "QA Test User",
      email: `qatest_${Date.now()}@example.com`,
      phone: `+9199999${Math.floor(Math.random() * 10000)}`,
      role: UserRole.USER,
      authProvider: "local",
      status: "active",
      credits: 0,
      rewardPoints: 0,
    });

    const partner = await UserModel.create({
      fullName: "QA Partner User",
      email: `qapartner_${Date.now()}@example.com`,
      phone: `+9188888${Math.floor(Math.random() * 10000)}`,
      role: UserRole.PARTNER,
      authProvider: "local",
      status: "active",
      credits: 0,
      rewardPoints: 0,
    });

    const spaceId = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId();

    console.log("🔨 Creating Test Booking...");
    const booking = await BookingModel.create({
      bookingNumber: `BKG-QA-${Date.now()}`,
      user: user._id,
      partner: partner._id,
      payment: paymentId,
      spaceId: spaceId,
      type: "CoworkingSpace",
      status: "pending_payment", // Valid enum
      autoRenew: false,
      amount: 10000,
      taxAmount: 1800,
      totalAmount: 11800,
      plan: {
        name: "Monthly",
        key: "monthly",
        price: 10000,
        tenure: 1,
      },
    });

    console.log("✅ Booking Created:", booking._id.toString());

    // 2. Test BookingService.getAllBookings
    const allBookings = await BookingService.getAllBookings(
      user._id.toString(),
    );
    if (
      allBookings.bookings.length === 1 &&
      allBookings.pagination.total === 1
    ) {
      console.log("✅ Service: getAllBookings - PASS");
    } else {
      console.error("❌ Service: getAllBookings - FAIL");
    }

    // 3. Test BookingService.getBookingById
    const singleBooking = await BookingService.getBookingById(
      user._id.toString(),
      booking._id.toString(),
    );
    if (
      singleBooking &&
      singleBooking._id.toString() === booking._id.toString()
    ) {
      console.log("✅ Service: getBookingById - PASS");
    } else {
      console.error("❌ Service: getBookingById - FAIL");
    }

    // 4. Test BookingService.toggleAutoRenew
    const renewed = await BookingService.toggleAutoRenew(
      user._id.toString(),
      booking._id.toString(),
      true,
    );
    if (renewed && renewed.autoRenew === true) {
      console.log("✅ Service: toggleAutoRenew - PASS");
    } else {
      console.error("❌ Service: toggleAutoRenew - FAIL");
    }

    // 5. Test Link Profile (KYC)
    console.log("🔨 Creating Test KYC Profile...");
    const kyc = await KYCDocumentModel.create({
      user: user._id,
      overallStatus: "approved",
      progress: 100,
      personalInfo: {
        fullName: "QA Test User",
        email: user.email,
        phone: (user as any).phone,
        verified: true,
      },
    });

    const linkedBooking = await BookingService.linkBookingToProfile(
      user._id.toString(),
      booking._id.toString(),
      kyc._id.toString(),
    );
    if (
      linkedBooking &&
      linkedBooking.status === "active" &&
      linkedBooking.kycProfile?.toString() === kyc._id.toString()
    ) {
      console.log("✅ Service: linkBookingToProfile (KYC) - PASS");
    } else {
      console.error("❌ Service: linkBookingToProfile (KYC) - FAIL");
    }

    // 6. Test Partner Dashboard
    const dashboard = await BookingService.getPartnerDashboardOverview(
      partner._id.toString(),
    );
    if (dashboard.length === 1 && dashboard[0].status === "ACTIVE") {
      console.log("✅ Service: getPartnerDashboardOverview - PASS");
    } else {
      console.error("❌ Service: getPartnerDashboardOverview - FAIL");
    }
  } catch (error) {
    console.error("💥 Integration Test Error:", error);
  } finally {
    console.log("🧹 Cleaning up...");
    // await BookingModel.deleteMany({ bookingNumber: { $regex: /^BKG-QA-/ } });
    // await UserModel.deleteMany({ email: { $regex: /^qa(?:test|partner)_/ } });
    // await KYCDocumentModel.deleteMany({ "personalInfo.fullName": "QA Test User" });
    await mongoose.disconnect();
    console.log("✅ Disconnected & Done");
  }
}

testBookingAPIs();
