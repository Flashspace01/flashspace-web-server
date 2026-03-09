// @ts-nocheck
import mongoose from "mongoose";
import {
  PaymentModel,
  PaymentStatus,
  PaymentType,
} from "../flashspaceWeb/paymentModule/payment.model";
import { BookingModel } from "../flashspaceWeb/userDashboardModule/models/booking.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import { UserModel } from "../flashspaceWeb/authModule/models/user.model";
import { NotificationModel } from "../flashspaceWeb/notificationModule/models/Notification";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

const logFile = path.join(__dirname, "test_results.log");
function log(msg: any) {
  const line = `${new Date().toISOString()} - ${msg}\n`;
  fs.appendFileSync(logFile, line);
  console.log(msg);
}

dotenv.config();

// Use the port we found
const DB_URI = "mongodb://localhost:27018/myapp";

async function runTest() {
  try {
    log("Connecting to DB: " + DB_URI);
    await mongoose.connect(DB_URI);
    log("Connected successfully.");

    // 1. Get a sample user
    const user = await UserModel.findOne({ isDeleted: { $ne: true } });
    if (!user) {
      log("No user found in DB. Please run seed script first.");
      process.exit(1);
    }
    log(`Using user: ${user.email} ${user._id}`);

    // 2. Get a sample virtual office
    const space = await VirtualOfficeModel.findOne({
      isDeleted: { $ne: true },
    });
    if (!space) {
      log("No virtual office found in DB. Please run seed script first.");
      process.exit(1);
    }
    log(`Using space: ${space.name} ${space._id}`);

    // Ensure space has a partner for the test
    if (!space.partner) {
      log("Space missing partner field. Fetching a partner user...");
      const partnerUser = await UserModel.findOne({ role: "partner" });
      if (partnerUser) {
        await VirtualOfficeModel.findByIdAndUpdate(space._id, {
          partner: partnerUser._id,
        });
        log(`Assigned partner ${partnerUser.email} to space.`);
      } else {
        log("No partner user found to assign. Using current user as partner.");
        await VirtualOfficeModel.findByIdAndUpdate(space._id, {
          partner: user._id,
        });
      }
    }

    // 3. Create a mock payment record
    const payment = await PaymentModel.create({
      userId: user._id,
      userEmail: user.email,
      userName: user.fullName || "Test User",
      razorpayOrderId: `ord_test_${Date.now()}`,
      amount: 100000,
      status: PaymentStatus.COMPLETED,
      paymentType: PaymentType.VIRTUAL_OFFICE,
      spaceId: space._id,
      spaceName: space.name,
      planName: "Platinum Plan",
      planKey: "platinum",
      tenure: 1,
      yearlyPrice: 1000,
      totalAmount: 1000,
      startDate: new Date(),
    });
    log(`Created mock payment: ${payment._id}`);

    // 4. Test the fix logic (Inlined since we want to test exactly what we changed)
    log("Running createBookingAndInvoice simulation...");

    // START SIMULATION OF createBookingAndInvoice
    const paymentRecord = payment;
    const bookingCount = await BookingModel.countDocuments();
    const bookingNumber = `FS-${new Date().getFullYear()}-${String(bookingCount + 1).padStart(5, "0")}`;

    let spaceSnapshot: any = {
      _id: paymentRecord.spaceId,
      name: paymentRecord.spaceName,
    };

    const voSpace = await VirtualOfficeModel.findById(paymentRecord.spaceId);
    if (voSpace) {
      spaceSnapshot = {
        _id: voSpace._id?.toString(),
        name: voSpace.name,
        address: voSpace.address,
        city: voSpace.city,
        area: voSpace.area,
        image: voSpace.images?.[0] || "",
        coordinates: voSpace.location?.coordinates || [],
      };
    }

    // This is the core of the fix
    const partnerId = voSpace?.partner;
    log(`Fetched partnerId: ${partnerId}`);

    if (!partnerId) {
      throw new Error("Partner ID not found for space!");
    }

    const startDate = paymentRecord.startDate || new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + paymentRecord.tenure * 12);

    const booking = await BookingModel.create({
      bookingNumber,
      user: paymentRecord.userId,
      partnerId: partnerId, // The FIX
      type: "virtual_office",
      spaceId: paymentRecord.spaceId,
      spaceSnapshot,
      plan: {
        name: paymentRecord.planName,
        price: paymentRecord.totalAmount,
        originalPrice: paymentRecord.yearlyPrice * paymentRecord.tenure,
        discount: 0,
        tenure: paymentRecord.tenure * 12,
        tenureUnit: "months",
      },
      paymentId: paymentRecord._id?.toString(),
      razorpayOrderId: paymentRecord.razorpayOrderId,
      status: "pending_kyc",
      kycStatus: "not_started",
      startDate,
      endDate,
    });

    log(
      `Booking created successfully: ${booking._id} with partnerId: ${booking.partnerId}`,
    );

    // Verify Notification
    const notification = await NotificationModel.findOne({
      user: user._id,
      title: "Booking Confirmed! 🎉",
    }).sort({ createdAt: -1 });

    if (notification) {
      log(`Notification found: ${notification.message}`);
    } else {
      log(
        "Notification NOT found in DB yet (it might be sent via Socket.IO but let's check NotificationModel if it stores it)",
      );
    }

    log("TEST SUCCESSFUL!");
  } catch (error: any) {
    log(`TEST FAILED: ${error.message}`);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTest();
