import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
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
import { SeatBookingModel } from "../flashspaceWeb/seatingModule/seating.model";
import { CoworkingSpaceService } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.service";

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const getRandomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const cities = ["Bangalore", "Mumbai", "Delhi", "Pune", "Hyderabad", "Chennai"];
const areas = [
  "Downtown",
  "Whitefield",
  "Bandra",
  "Connaught Place",
  "Hitech City",
  "Koramangala",
];
const mockImages = [
  "https://example.com/img1.jpg",
  "https://example.com/img2.jpg",
  "https://example.com/img3.jpg",
];
const firstNames = [
  "Amit",
  "Sneha",
  "Rahul",
  "Priya",
  "Vikram",
  "Neha",
  "Rohan",
  "Anjali",
  "Karan",
  "Pooja",
  "Arjun",
  "Kavita",
];
const lastNames = [
  "Sharma",
  "Gupta",
  "Singh",
  "Patel",
  "Kumar",
  "Verma",
  "Reddy",
  "Nair",
  "Iyer",
  "Joshi",
];

const runSeed = async () => {
  try {
    console.log("🌱 Connecting to database...");
    await dbConnection();

    console.log("💥 Dropping existing database...");
    await mongoose.connection.db!.dropDatabase();
    console.log("✅ Database dropped.");

    const passwordHash = await hashPassword("Password123!");

    //---------------------------------------------------------
    // 1. Auth Module: Generate 5 Partners
    //---------------------------------------------------------
    console.log("🔨 Seeding 5 Partners...");
    const partners = [];
    for (let i = 1; i <= 5; i++) {
      const partner = await UserModel.create({
        fullName: `Partner ${firstNames[i]} ${lastNames[i]}`,
        email: `partner${i}@flashspace.com`,
        password: passwordHash,
        role: "partner",
        isEmailVerified: true,
        provider: "local",
      });
      partners.push(partner);
    }

    //---------------------------------------------------------
    // 2. Auth Module: Generate 20 Users
    //---------------------------------------------------------
    console.log("🔨 Seeding 20 Users...");
    const users = [];
    for (let i = 1; i <= 20; i++) {
      const credits = getRandomInt(0, 50000);
      const user = await UserModel.create({
        fullName: `${getRandomItem(firstNames)} ${getRandomItem(lastNames)} (User ${i})`,
        email: `user${i}@flashspace.com`,
        password: passwordHash,
        role: "user",
        isEmailVerified: true,
        provider: "local",
        credits, // Preload credits for testing
      });
      users.push(user);

      // Seed Initial CreditLedger Entry for User if credits > 0
      if (credits > 0) {
        await CreditLedgerModel.create({
          user: user._id,
          amount: credits,
          type: "earned",
          description: "Sign-up Bonus",
          balanceAfter: credits,
        });
      }
    }

    // Admin
    await UserModel.create({
      fullName: "Super Admin",
      email: "admin@flashspace.com",
      password: passwordHash,
      role: "admin",
      isEmailVerified: true,
      provider: "local",
    });

    //---------------------------------------------------------
    // 3. Properties & Spaces (Coworking, VirtualOffice, MeetingRoom)
    //---------------------------------------------------------
    console.log("🔨 Seeding Properties and Spaces...");
    const allSpaces = [];
    const coworkingSpaces = [];

    // Each partner gets 2 properties
    for (let pIdx = 0; pIdx < partners.length; pIdx++) {
      const partner = partners[pIdx];

      for (let propIdx = 1; propIdx <= 2; propIdx++) {
        const randomCity = getRandomItem(cities);
        // Property
        const property = await PropertyModel.create({
          name: `FlashSpace Hub ${randomCity} ${propIdx} (Partner ${pIdx + 1})`,
          partner: partner._id,
          address: `${getRandomInt(10, 999)} Business Avenue`,
          city: randomCity,
          area: getRandomItem(areas),
          location: {
            type: "Point",
            coordinates: [77.0 + Math.random(), 12.0 + Math.random()],
          },
          amenities: ["WiFi", "AC", "Cafeteria", "Parking"],
          images: mockImages,
          status: "active",
        });

        // Coworking
        const cwPrice = getRandomInt(3000, 8000);
        const cwAdminMarkup = getRandomInt(500, 2000);
        const cwFinalPrice = cwPrice + cwAdminMarkup;

        const cw = await CoworkingSpaceModel.create({
          partner: partner._id,
          property: property._id,
          capacity: getRandomInt(50, 200),
          partnerPricePerMonth: cwPrice,
          adminMarkupPerMonth: cwAdminMarkup,
          finalPricePerMonth: cwFinalPrice,
          isActive: true,
          floors: CoworkingSpaceService.generateSeatsForFloors([
            {
              floorNumber: 1,
              name: "Ground Floor",
              tables: [
                { tableNumber: "T1", numberOfSeats: 10 },
                { tableNumber: "T2", numberOfSeats: 10 },
              ],
            },
          ]),
          operatingHours: {
            openTime: "08:00",
            closeTime: "20:00",
            daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          },
        });
        allSpaces.push({ modelName: "CoworkingSpace", space: cw, property });
        coworkingSpaces.push(cw);

        // Virtual Office
        const voPrice = getRandomInt(1000, 3000);
        const vo = await VirtualOfficeModel.create({
          partner: partner._id,
          property: property._id,
          isActive: true,
          partnerGstPricePerYear: voPrice,
          adminMarkupGstPerYear: 500,
          finalGstPricePerYear: voPrice + 500,
          partnerMailingPricePerYear: voPrice * 2,
          adminMarkupMailingPerYear: 500,
          finalMailingPricePerYear: voPrice * 2 + 500,
          partnerBrPricePerYear: voPrice * 3,
          adminMarkupBrPerYear: 500,
          finalBrPricePerYear: voPrice * 3 + 500,
        });
        allSpaces.push({ modelName: "VirtualOffice", space: vo, property });

        // Meeting Room
        const mrPrice = getRandomInt(200, 1000);
        const mrAdminMarkup = getRandomInt(50, 300);
        const mr = await MeetingRoomModel.create({
          partner: partner._id,
          property: property._id,
          capacity: getRandomInt(4, 20),
          type: "meeting_room",
          partnerPricePerHour: mrPrice,
          adminMarkupPerHour: mrAdminMarkup,
          finalPricePerHour: mrPrice + mrAdminMarkup,
          isActive: true,
          amenities: ["Projector", "Whiteboard"],
          images: mockImages,
          operatingHours: {
            openTime: "08:00",
            closeTime: "20:00",
            daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          },
        });
        allSpaces.push({ modelName: "MeetingRoom", space: mr, property });
      }
    }

    //---------------------------------------------------------
    // 4. Payment, Booking, Invoice, Reviews Setup
    //---------------------------------------------------------
    console.log("🔨 Seeding Payments, Bookings, Invoices, Reviews...");

    // Give each user 2-3 randomized bookings and reviews
    let userCount = 0;
    for (const user of users) {
      userCount++;
      console.log(`🔨 Processing User ${userCount}/20: ${user.email}`);
      const numBookings = getRandomInt(2, 4);

      for (let b = 0; b < numBookings; b++) {
        // Pick a random space
        const target = getRandomItem(allSpaces) as any;

        let paymentType = PaymentType.COWORKING_SPACE;
        let btype = "coworking_space";
        let amount = (target.space as any).finalPricePerMonth || 5000;
        let tenure = 1;
        let tUnit = "months";

        if (target.modelName === "VirtualOffice") {
          paymentType = PaymentType.VIRTUAL_OFFICE;
          btype = "virtual_office";
          amount = (target.space as any).finalGstPricePerYear;
          tenure = 1;
          tUnit = "years";
        } else if (target.modelName === "MeetingRoom") {
          paymentType = PaymentType.MEETING_ROOM;
          btype = "meeting_room";
          amount = (target.space as any).finalPricePerHour;
          tenure = 2;
          tUnit = "hours";
        }

        console.log(
          `   - Creating booking ${b + 1}/${numBookings} for space ${target.modelName}`,
        );
        const totalWithGST = Math.floor(amount * 1.18);

        // 1. Payment
        console.log(`     - Creating Payment...`);
        const payment = await PaymentModel.create({
          user: user._id,
          userEmail: user.email,
          userName: user.fullName,
          razorpayOrderId: `order_${Date.now()}_${b}`,
          razorpayPaymentId: `pay_${Date.now()}_${b}`,
          razorpaySignature: "valid_signature_mock",
          space: target.space._id,
          spaceModel: target.modelName,
          spaceName: target.property.name,
          planName: "Random Plan",
          planKey: "plan_key",
          tenure,
          yearlyPrice: amount,
          amount: totalWithGST * 100, // Paise
          totalAmount: totalWithGST,
          status: PaymentStatus.COMPLETED,
          paymentType,
        });

        // 2. Booking
        console.log(`     - Creating Booking...`);
        const booking = await BookingModel.create({
          bookingNumber: `FS-BKG-${Date.now()}-${b}`,
          user: user._id,
          partner: target.space.partner,
          type: target.modelName,
          status: "active",
          startDate: new Date(),
          endDate: new Date(
            new Date().setMonth(new Date().getMonth() + tenure),
          ),
          spaceId: target.space._id,
          spaceSnapshot: {
            name: target.property.name,
            propertyId: target.property._id.toString(),
          },
          plan: {
            name: "Random Plan",
            price: amount,
            tenure,
            tenureUnit: tUnit,
          },
          paymentId: payment._id,
          amountPaid: totalWithGST,
        });

        // 3. Invoice
        console.log(`     - Creating Invoice...`);
        await InvoiceModel.create({
          invoiceNumber: `INV-${Date.now()}-${b}`,
          user: user._id,
          partner: target.space.partner,
          bookingId: booking._id,
          paymentId: payment._id,
          description: `${btype} booking`,
          subtotal: amount,
          total: totalWithGST,
          status: "paid",
        });

        // 4. Review
        if (Math.random() > 0.5) {
          // 50% chance of reviewing
          try {
            await ReviewModel.create({
              user: user._id,
              space: target.space._id,
              spaceModel: target.modelName,
              rating: getRandomInt(3, 5),
              comment:
                "This is a randomly generated review text! The facilities are nice.",
            });
          } catch (err) {
            // Ignore unique constraint overrides during aggressive loop
          }
        }
      }

      //---------------------------------------------------------
      // 5. Seating Module (Coworking SeatBookings)
      //---------------------------------------------------------
      if (Math.random() > 0.5 && coworkingSpaces.length > 0) {
        const cwSpace = getRandomItem(coworkingSpaces) as any;
        if (
          cwSpace.floors &&
          cwSpace.floors[0] &&
          cwSpace.floors[0].tables &&
          cwSpace.floors[0].tables[0] &&
          cwSpace.floors[0].tables[0].seats &&
          cwSpace.floors[0].tables[0].seats[0]
        ) {
          const seatId = cwSpace.floors[0].tables[0].seats[0]._id;

          await SeatBookingModel.create({
            space: cwSpace._id,
            user: user._id,
            startTime: new Date(),
            endTime: new Date(new Date().setHours(new Date().getHours() + 6)),
            seatIds: [seatId],
            totalAmount: getRandomInt(500, 1500),
            status: "confirmed",
            paymentId: `pay_seat_${Date.now()}`,
          });
        }
      }
    }

    console.log(`\n🎉 LARGE SEED COMPLETE!`);
    console.log(
      `Generated: 5 Partners, 20 Users, 10 Properties, 30 Spaces, ~60 Bookings, Invoices, Payments, Reviews.`,
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Failed:", error);
    process.exit(1);
  }
};

runSeed();
