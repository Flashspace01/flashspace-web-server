import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { dbConnection } from "../config/db.config";

// Models
import { UserModel } from "../flashspaceWeb/authModule/models/user.model";
import { PropertyModel } from "../flashspaceWeb/propertyModule/property.model";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import {
  MeetingRoomModel,
  MeetingRoomType,
} from "../flashspaceWeb/meetingRoomModule/meetingRoom.model"; // UPDATED IMPORT
import { BookingModel } from "../flashspaceWeb/bookingModule/booking.model";
import { InvoiceModel } from "../flashspaceWeb/invoiceModule/invoice.model";
import {
  PaymentModel,
  PaymentStatus,
  PaymentType,
} from "../flashspaceWeb/paymentModule/payment.model";
import { ReviewModel } from "../flashspaceWeb/reviewsModule/review.model";
import { CreditLedgerModel } from "../flashspaceWeb/creditLedgerModule/creditLedger.model";
import { CoworkingSpaceService } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.service";
import { SeatBookingModel } from "../flashspaceWeb/seatingModule/seating.model"; // ADDED SEAT BOOKING IMPORT
import { SpaceApprovalStatus } from "../flashspaceWeb/shared/enums/spaceApproval.enum"; // ADDED IMPORT

// --- SCALE CONFIGURATION ---
const SCALE = {
  PARTNERS: 25,
  USERS: 500,
  PROPERTIES_PER_PARTNER: 3,
  BOOKINGS_PER_USER_MIN: 1,
  BOOKINGS_PER_USER_MAX: 5,
};

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const getRandomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const runSeed = async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("🚨 DANGER: Cannot run seed script in production!");
    process.exit(1);
  }

  try {
    console.log("🌱 Connecting to database...");
    await dbConnection();

    console.log("💥 Dropping existing database...");
    await mongoose.connection.db!.dropDatabase();

    const passwordHash = await hashPassword("Password123!");

    //---------------------------------------------------------
    // 1. Bulk Insert Partners
    //---------------------------------------------------------
    console.log(`🔨 Generating ${SCALE.PARTNERS} Partners...`);
    const partnerDocs = Array.from({ length: SCALE.PARTNERS }).map(() => ({
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      password: passwordHash,
      role: "partner",
      isEmailVerified: true,
      provider: "local",
    }));
    const partners = await UserModel.insertMany(partnerDocs);

    //---------------------------------------------------------
    // 2. Bulk Insert Users & Initial Credits
    //---------------------------------------------------------
    console.log(`🔨 Generating ${SCALE.USERS} Users...`);
    const userDocs = Array.from({ length: SCALE.USERS }).map(() => ({
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      password: passwordHash,
      role: "user",
      isEmailVerified: true,
      provider: "local",
      credits: getRandomInt(0, 50000),
    }));
    const users = await UserModel.insertMany(userDocs);

    console.log("🔨 Generating Credit Ledgers for Users...");
    const creditDocs = users
      .filter((u) => u.credits > 0)
      .map((user) => ({
        user: user._id,
        amount: user.credits,
        type: "earned",
        description: "Sign-up Bonus",
        balanceAfter: user.credits,
      }));
    if (creditDocs.length > 0) await CreditLedgerModel.insertMany(creditDocs);

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
    // 3. Bulk Insert Properties & Spaces
    //---------------------------------------------------------
    console.log(`🔨 Generating Properties and Spaces...`);
    const propertyDocs = [];

    for (const partner of partners) {
      for (let i = 0; i < SCALE.PROPERTIES_PER_PARTNER; i++) {
        propertyDocs.push({
          name: `${faker.company.name()} Hub`,
          partner: partner._id,
          address: faker.location.streetAddress(),
          city: faker.location.city(),
          area: faker.location.street(),
          location: {
            type: "Point",
            coordinates: [
              faker.location.longitude(),
              faker.location.latitude(),
            ],
          },
          amenities: faker.helpers.arrayElements(
            ["WiFi", "AC", "Cafeteria", "Parking", "Gym"],
            { min: 2, max: 4 },
          ),
          images: [
            faker.image.urlPicsumPhotos(),
            faker.image.urlPicsumPhotos(),
          ],
          status: "active",
        });
      }
    }
    const properties = await PropertyModel.insertMany(propertyDocs);

    const coworkingDocs: any[] = [];
    const virtualOfficeDocs: any[] = [];
    const meetingRoomDocs: any[] = [];
    const allSpaces: any[] = [];

    // We will extract individual seats here to easily map SeatBookings later
    const availableSeats: { spaceId: any; seatId: any }[] = [];

    for (const property of properties) {
      // 1 Coworking Space per Property
      const cwPrice = getRandomInt(3000, 8000);
      const cwMarkup = getRandomInt(500, 2000);
      const cwId = new mongoose.Types.ObjectId();

      const floors = CoworkingSpaceService.generateSeatsForFloors([
        {
          floorNumber: 1,
          name: "Ground Floor",
          tables: [
            { tableNumber: "T1", numberOfSeats: 10 },
            { tableNumber: "T2", numberOfSeats: 10 },
          ],
        },
      ]);

      // Extract seats for our SeatBooking generation
      floors?.forEach((floor: any) => {
        floor.tables.forEach((table: any) => {
          table.seats.forEach((seat: any) => {
            if (!seat._id) seat._id = new mongoose.Types.ObjectId();
            availableSeats.push({ spaceId: cwId, seatId: seat._id });
          });
        });
      });

      coworkingDocs.push({
        _id: cwId,
        partner: property.partner,
        property: property._id,
        capacity: getRandomInt(50, 200),
        partnerPricePerMonth: cwPrice,
        adminMarkupPerMonth: cwMarkup,
        finalPricePerMonth: cwPrice + cwMarkup,
        isActive: true,
        floors: floors,
        operatingHours: {
          openTime: "08:00",
          closeTime: "20:00",
          daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        },
      });
      allSpaces.push({
        _id: cwId,
        modelName: "CoworkingSpace",
        price: cwPrice + cwMarkup,
        partner: property.partner,
        property,
      });

      // 1 Virtual Office per Property
      const voPrice = getRandomInt(1000, 3000);
      const voId = new mongoose.Types.ObjectId();
      virtualOfficeDocs.push({
        /* ... (Kept the same) ... */ _id: voId,
        partner: property.partner,
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
      allSpaces.push({
        _id: voId,
        modelName: "VirtualOffice",
        price: voPrice + 500,
        partner: property.partner,
        property,
      });

      // 1 Meeting Room per Property (UPDATED TO MATCH YOUR NEW MODEL)
      const mrPriceHour = getRandomInt(200, 1000);
      const mrMarkupHour = getRandomInt(50, 300);
      const mrPriceDay = mrPriceHour * 8; // Assuming 8 hour work day discount
      const mrMarkupDay = mrMarkupHour * 8;

      const mrId = new mongoose.Types.ObjectId();
      meetingRoomDocs.push({
        _id: mrId,
        property: property._id,
        partner: property.partner,
        approvalStatus: SpaceApprovalStatus.ACTIVE, // Make them active right away
        partnerPricePerHour: mrPriceHour,
        adminMarkupPerHour: mrMarkupHour,
        finalPricePerHour: mrPriceHour + mrMarkupHour,
        partnerPricePerDay: mrPriceDay,
        adminMarkupPerDay: mrMarkupDay,
        finalPricePerDay: mrPriceDay + mrMarkupDay,
        operatingHours: {
          openTime: "08:00",
          closeTime: "20:00",
          daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        },
        minBookingHours: getRandomInt(1, 3),
        capacity: getRandomInt(4, 20),
        type: faker.helpers.arrayElement(Object.values(MeetingRoomType)), // meeting_room, board_room, etc.
        avgRating: 0,
        totalReviews: 0,
        sponsored: faker.datatype.boolean(),
        popular: faker.datatype.boolean(),
        amenities: ["Projector", "Whiteboard", "TV Screen", "WiFi"],
        isActive: true,
        isDeleted: false,
      });
      allSpaces.push({
        _id: mrId,
        modelName: "MeetingRoom",
        price: mrPriceHour + mrMarkupHour,
        partner: property.partner,
        property,
      });
    }

    await CoworkingSpaceModel.insertMany(coworkingDocs);
    await VirtualOfficeModel.insertMany(virtualOfficeDocs);
    await MeetingRoomModel.insertMany(meetingRoomDocs);

    //---------------------------------------------------------
    // 4. Bulk Insert Bookings, Payments, Invoices & SEATS
    //---------------------------------------------------------
    console.log(
      `🔨 Generating Thousands of Bookings, Payments & Seat Bookings...`,
    );

    const paymentDocs = [];
    const bookingDocs = [];
    const invoiceDocs = [];
    const reviewDocs = [];
    const seatBookingDocs = []; // Array for Seat Bookings

    for (const user of users) {
      const numBookings = getRandomInt(
        SCALE.BOOKINGS_PER_USER_MIN,
        SCALE.BOOKINGS_PER_USER_MAX,
      );

      for (let b = 0; b < numBookings; b++) {
        const target = getRandomItem(allSpaces);

        let paymentType, tUnit;
        let tenure = 1;

        if (target.modelName === "CoworkingSpace") {
          paymentType = PaymentType.COWORKING_SPACE;
          tUnit = "months";
        } else if (target.modelName === "VirtualOffice") {
          paymentType = PaymentType.VIRTUAL_OFFICE;
          tUnit = "years";
        } else {
          paymentType = PaymentType.MEETING_ROOM;
          tUnit = "hours";
          tenure = 2;
        }

        const totalWithGST = Math.floor(target.price * 1.18);
        const paymentId = new mongoose.Types.ObjectId();
        const bookingId = new mongoose.Types.ObjectId();

        paymentDocs.push({
          _id: paymentId,
          user: user._id,
          userEmail: user.email,
          userName: user.fullName,
          razorpayOrderId: `order_${faker.string.alphanumeric(10)}`,
          razorpayPaymentId: `pay_${faker.string.alphanumeric(10)}`,
          razorpaySignature: "valid_signature_mock",
          space: target._id,
          spaceModel: target.modelName,
          spaceName: target.property.name,
          planName: "Standard Plan",
          planKey: "plan_key",
          tenure,
          yearlyPrice: target.price,
          amount: totalWithGST * 100,
          totalAmount: totalWithGST,
          status: PaymentStatus.COMPLETED,
          paymentType,
        });

        bookingDocs.push({
          _id: bookingId,
          bookingNumber: `FS-BKG-${faker.string.alphanumeric(8).toUpperCase()}`,
          user: user._id,
          partner: target.partner,
          type: target.modelName,
          status: "active",
          startDate: faker.date.recent(),
          endDate: faker.date.future(),
          spaceId: target._id,
          spaceSnapshot: {
            name: target.property.name,
            propertyId: target.property._id.toString(),
          },
          plan: {
            name: "Standard Plan",
            price: target.price,
            tenure,
            tenureUnit: tUnit,
          },
          paymentId: paymentId,
          amountPaid: totalWithGST,
        });

        invoiceDocs.push({
          invoiceNumber: `INV-${faker.string.numeric(8)}`,
          user: user._id,
          partner: target.partner,
          bookingId: bookingId,
          paymentId: paymentId,
          description: `${target.modelName} booking`,
          subtotal: target.price,
          total: totalWithGST,
          status: "paid",
        });

        if (Math.random() > 0.7) {
          reviewDocs.push({
            user: user._id,
            space: target._id,
            spaceModel: target.modelName,
            rating: getRandomInt(3, 5),
            comment: faker.lorem.sentences(2),
          });
        }
      }

      // ADDED: Generate 1-2 random SEAT BOOKINGS for this user
      if (availableSeats.length > 0 && Math.random() > 0.5) {
        const numSeatBookings = getRandomInt(1, 2);
        for (let s = 0; s < numSeatBookings; s++) {
          const randomSeat = getRandomItem(availableSeats);
          const seatPaymentId = new mongoose.Types.ObjectId();
          const amount = getRandomInt(500, 1500);

          seatBookingDocs.push({
            space: randomSeat.spaceId,
            user: user._id,
            startTime: faker.date.recent(),
            endTime: faker.date.soon(),
            seatIds: [randomSeat.seatId], // Linking the actual seat generated by CoworkingSpaceService
            totalAmount: amount,
            status: "confirmed",
            paymentId: seatPaymentId,
          });

          // Create a mock payment for the seat booking
          paymentDocs.push({
            _id: seatPaymentId,
            user: user._id,
            userEmail: user.email,
            userName: user.fullName,
            razorpayOrderId: `order_seat_${faker.string.alphanumeric(10)}`,
            razorpayPaymentId: `pay_seat_${faker.string.alphanumeric(10)}`,
            razorpaySignature: "valid_signature",
            space: randomSeat.spaceId,
            spaceModel: "CoworkingSpace",
            spaceName: "Seat Booking",
            planName: "Daily Pass",
            planKey: "daily_pass",
            tenure: 1,
            yearlyPrice: amount,
            amount: amount * 100,
            totalAmount: amount,
            status: PaymentStatus.COMPLETED,
            paymentType: PaymentType.COWORKING_SPACE,
          });
        }
      }
    }

    // Insert massive arrays in one go
    await PaymentModel.insertMany(paymentDocs);
    await BookingModel.insertMany(bookingDocs);
    await InvoiceModel.insertMany(invoiceDocs);
    await SeatBookingModel.insertMany(seatBookingDocs); // ADDED BULK INSERT FOR SEATS

    if (reviewDocs.length > 0) {
      await ReviewModel.insertMany(reviewDocs, { ordered: false }).catch(
        () => {},
      );
    }

    console.log(`\n🎉 MASSIVE SEED COMPLETE!`);
    console.log(
      `Generated: ${SCALE.PARTNERS} Partners, ${SCALE.USERS} Users, ${properties.length} Properties.`,
    );
    console.log(`Generated: ${bookingDocs.length} Bookings.`);
    console.log(`Generated: ${seatBookingDocs.length} Seat Bookings.`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Failed:", error);
    process.exit(1);
  }
};

runSeed();
