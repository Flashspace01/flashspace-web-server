import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { UserModel } from "../flashspaceWeb/authModule/models/user.model";
import { BookingModel } from "../flashspaceWeb/userDashboardModule/models/booking.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function findPartner() {
  try {
    const dbUri = process.env.DB_URI;
    if (!dbUri) {
      console.error("DB_URI not found");
      return;
    }

    await mongoose.connect(dbUri);
    console.log("Connected to Database");

    const userEmail = "seth.conn@gmail.com";
    const user = await UserModel.findOne({ email: userEmail });

    if (!user) {
      console.error(`User ${userEmail} not found`);
      return;
    }

    console.log(`Found User: ${user.fullName} (${user._id})`);

    const bookings = await BookingModel.find({ user: user._id });
    console.log(`Found ${bookings.length} bookings for this user`);

    for (const booking of bookings) {
      console.log(`\nBooking: ${booking.bookingNumber} (${booking.type})`);
      console.log(
        `Space Snapshot: ${JSON.stringify(booking.spaceSnapshot, null, 2)}`,
      );

      if (
        booking.type === "virtual_office" ||
        booking.type === "VirtualOffice"
      ) {
        const space = await VirtualOfficeModel.findById(
          booking.spaceId,
        ).populate("partner");
        if (space) {
          const partner = space.partner as any;
          if (partner) {
            console.log(`Associated Space: ${space.name}`);
            console.log(`Partner: ${partner.fullName} (${partner.email})`);
          } else {
            console.log(
              `Associated Space: ${space.name} (No partner assigned)`,
            );
          }
        } else {
          console.log(`Virtual Office ${booking.spaceId} not found`);
        }
      } else if (
        booking.type === "meeting_room" ||
        booking.type === "MeetingRoom" ||
        booking.type === "coworking_space" ||
        booking.type === "CoworkingSpace"
      ) {
        // Try Virtual Office first anyway if type matches
        let spaceFound = false;

        // Try Space model from spacePartnerModule
        const Space =
          require("../flashspaceWeb/spacePartnerModule/models/space.model").Space;
        const genericSpace = await Space.findById(booking.spaceId).populate(
          "partnerId",
        );
        if (genericSpace) {
          spaceFound = true;
          const partner = genericSpace.partnerId as any;
          console.log(
            `Associated Generic Space: ${genericSpace.name} (${genericSpace.category})`,
          );
          console.log(`Partner: ${partner.fullName} (${partner.email})`);
        }

        if (!spaceFound) {
          // Try CoworkingSpaceModel
          const CoworkingSpaceModel =
            require("../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model").CoworkingSpaceModel;
          const coworkingSpace = await CoworkingSpaceModel.findById(
            booking.spaceId,
          ).populate("partner");
          if (coworkingSpace) {
            spaceFound = true;
            const partner = coworkingSpace.partner as any;
            console.log(`Associated Coworking Space: ${coworkingSpace.name}`);
            console.log(
              `Partner: ${partner ? `${partner.fullName} (${partner.email})` : "No partner assigned"}`,
            );
          }
        }

        if (!spaceFound) {
          console.log(`Space ${booking.spaceId} not found in any known model.`);
        }
      } else {
        console.log(
          `Booking type ${booking.type} not directly handled in this script yet.`,
        );
      }
    }

    // Check for Payments
    const {
      PaymentModel,
    } = require("../flashspaceWeb/paymentModule/payment.model");
    const payments = await PaymentModel.find({ userId: user._id });
    console.log(`\nFound ${payments.length} payment records for this user`);
    for (const payment of payments) {
      console.log(
        `- Payment: ${payment.razorpayOrderId}, Status: ${payment.status}, Space: ${payment.spaceName}, Plan: ${payment.planName}, Type: ${payment.paymentType}`,
      );
    }

    // Check for Mails
    const Mail =
      require("../flashspaceWeb/mailModule/models/mail.model").default;
    const mails = await Mail.find({
      $or: [{ client: user.fullName }, { client: user.email }],
    });
    console.log(`\nFound ${mails.length} mail records for this user`);
    for (const mail of mails) {
      console.log(
        `- Type: ${mail.type}, Sender: ${mail.sender}, Space: ${mail.space}, Status: ${mail.status}, Date: ${mail.received}`,
      );
    }

    // Check for Visits
    const Visit =
      require("../flashspaceWeb/visitModule/models/visit.model").default;
    const visits = await Visit.find({
      $or: [{ client: user.fullName }, { client: user.email }],
    });
    console.log(`\nFound ${visits.length} visit records for this user`);
    for (const visit of visits) {
      console.log(
        `- Visitor: ${visit.visitor}, Purpose: ${visit.purpose}, Space: ${visit.space}, Status: ${visit.status}, Date: ${visit.date}`,
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

findPartner();
