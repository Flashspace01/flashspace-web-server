
import mongoose from "mongoose";
import { PaymentModel, PaymentType } from "./src/flashspaceWeb/paymentModule/payment.model";
import { BookingModel } from "./src/flashspaceWeb/userDashboardModule/models/booking.model";
import { CreditLedgerModel, CreditSource } from "./src/flashspaceWeb/userDashboardModule/models/creditLedger.model";
import { UserModel } from "./src/flashspaceWeb/authModule/models/user.model";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.DB_URI || "mongodb://localhost:27017/flashspace";

async function debugLatestPayment() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        // Get the latest payment with amount > 0
        const payment = await PaymentModel.findOne({ totalAmount: { $gt: 0 } }).sort({ createdAt: -1 });

        if (!payment) {
            console.log("No payments found");
            return;
        }

        console.log("Latest Payment:", {
            id: payment._id,
            type: payment.paymentType,
            amount: payment.totalAmount,
            status: payment.status,
            createdAt: payment.createdAt
        });

        if (payment.paymentType !== PaymentType.MEETING_ROOM) {
            console.log("WARNING: Payment is not MEETING_ROOM. Currently:", payment.paymentType);
            console.log("Expected:", PaymentType.MEETING_ROOM);
        }

        const creditPercentage = 0.01;
        const creditsEarned = Math.floor(payment.totalAmount * creditPercentage);
        console.log("Calculated Credits:", creditsEarned);

        if (creditsEarned > 0) {
            // Check Booking
            const booking = await BookingModel.findOne({ paymentId: payment._id });
            if (!booking) {
                console.log("WARNING: No booking found for this payment!");
            } else {
                console.log("Booking found:", booking.bookingNumber);

                // Check Ledger
                const ledger = await CreditLedgerModel.findOne({
                    referenceId: booking._id.toString(),
                    source: CreditSource.BOOKING
                });

                if (ledger) {
                    console.log("Credit Ledger Entry found:", ledger);
                } else {
                    console.log("WARNING: No Credit Ledger Entry found!");

                    // Simulate awarding
                    console.log("Simulating award...");
                    // logic here...
                }
            }
        } else {
            console.log("Credits earned is 0, so no award expected.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

debugLatestPayment();
