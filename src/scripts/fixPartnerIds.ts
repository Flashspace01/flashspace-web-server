import mongoose from "mongoose";
import dotenv from "dotenv";
import { BookingModel } from "../flashspaceWeb/bookingModule/booking.model";
import { InvoiceModel } from "../flashspaceWeb/invoiceModule/invoice.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { MeetingRoomModel } from "../flashspaceWeb/meetingRoomModule/meetingRoom.model";

dotenv.config();

async function fixPartnerIds() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/flashspace");
        console.log("Connected successfully!");

        const bookings = await BookingModel.find({ isDeleted: false });
        console.log(`Found ${bookings.length} total bookings. Checking partner assignments...`);

        let updatedCount = 0;

        for (const booking of bookings) {
            if (!booking.spaceId) continue;

            let truePartnerId = null;

            if (booking.type === "VirtualOffice") {
                const space = await VirtualOfficeModel.findById(booking.spaceId);
                truePartnerId = space?.partner;
            } else if (booking.type === "CoworkingSpace") {
                const space = await CoworkingSpaceModel.findById(booking.spaceId);
                truePartnerId = space?.partner;
            } else if (booking.type === "MeetingRoom") {
                const space = await MeetingRoomModel.findById(booking.spaceId);
                truePartnerId = space?.partner;
            }

            if (truePartnerId && booking.partner?.toString() !== truePartnerId.toString()) {
                console.log(`Fixing booking ${booking.bookingNumber || booking._id}: changing partner from ${booking.partner} to ${truePartnerId}`);
                booking.partner = truePartnerId as any;
                await booking.save();

                // Also fix the related invoice
                const invoices = await InvoiceModel.find({ booking: booking._id });
                for (const invoice of invoices) {
                    invoice.partner = truePartnerId as any;
                    await invoice.save();
                }

                updatedCount++;
            }
        }

        console.log(`\nFixed ${updatedCount} bookings and their corresponding invoices.`);
        console.log("Disconnected from database.");
        process.exit(0);
    } catch (error) {
        console.error("Error during migration:", error);
        process.exit(1);
    }
}

fixPartnerIds();