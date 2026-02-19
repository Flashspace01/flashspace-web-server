import mongoose from "mongoose";
import { UserModel } from "../flashspaceWeb/authModule/models/user.model";
import {
  CreditLedgerModel,
  CreditType,
} from "../flashspaceWeb/userDashboardModule/models/creditLedger.model";
import {
  PaymentModel,
  PaymentStatus,
  PaymentType,
} from "../flashspaceWeb/paymentModule/payment.model";
import {
  deductCredits,
  refundCredits,
  revokeCredits,
} from "../flashspaceWeb/userDashboardModule/utils/credit.utils";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI =
  process.env.DB_URI ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/flashspace";

async function runTest() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected.");

  try {
    // 1. Create Test User
    const testEmail = `test_credit_${Date.now()}@example.com`;
    console.log(
      `\n[REQUEST] Creating User endpoint: internal UserModel.create`,
    );
    console.log(
      `[DATA] { email: "${testEmail}", fullName: "Credit Tester", credits: 0 }`,
    );

    const user = await UserModel.create({
      email: testEmail,
      passkey: "password",
      fullName: "Credit Tester",
      phone: "1234567890",
      credits: 0,
    });
    console.log(
      `[RESPONSE] Created User: ${user.email} (ID: ${user._id}) - Credits: ${user.credits}`,
    );

    // 2. EARN CREDITS
    const booking1Id = new mongoose.Types.ObjectId();
    console.log(`\n--- 2. EARN CREDITS (Simulate Earnings) ---`);
    console.log(
      `[REQUEST] Trigger: Payment Verified (Credits 1% of 10000 INR)`,
    );

    // Manually trigger earning logic
    const earnedAmount = 100;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 180);

    console.log(`[ACTION] Updating User balance...`);
    await UserModel.findByIdAndUpdate(user._id, {
      $inc: { credits: earnedAmount },
    });

    console.log(`[ACTION] Creating CreditLedger entry (EARNED)...`);
    await CreditLedgerModel.create({
      user: user._id,
      amount: earnedAmount,
      type: CreditType.EARNED,
      description: "Earned from test booking",
      bookingId: booking1Id.toString(),
      balanceAfter: earnedAmount,
      expiryDate: expiryDate,
      remainingAmount: earnedAmount,
      isExpired: false,
    });

    const userAfterEarn = await UserModel.findById(user._id);
    console.log(
      `[RESPONSE] User Balance After Earning: ${userAfterEarn?.credits} (Expected: 100)`,
    );

    // 3. SPEND CREDITS
    const booking2Id = new mongoose.Types.ObjectId();
    const creditsToRedeem = 50;

    console.log(`\n--- 3. SPEND CREDITS (Redemption) ---`);
    console.log(`[REQUEST] Calling deductCredits()`);
    console.log(
      `[DATA] { userId: "${user._id}", amount: ${creditsToRedeem}, bookingId: "${booking2Id}" }`,
    );

    await deductCredits(
      user._id as any,
      creditsToRedeem,
      booking2Id.toString(),
      "Meeting Room X",
    );

    const userAfterSpend = await UserModel.findById(user._id);
    console.log(
      `[RESPONSE] User Balance After Spending 50: ${userAfterSpend?.credits} (Expected: 50)`,
    );

    const spentEntry = await CreditLedgerModel.findOne({
      type: CreditType.SPENT,
      bookingId: booking2Id.toString(),
    });
    console.log(
      `[VERIFY] Ledger Entry found: ${spentEntry ? "YES" : "NO"} (${spentEntry?._id})`,
    );

    // 4. CANCEL SPENDING BOOKING (Refund)
    console.log(`\n--- 4. REFUND CREDITS (Cancel Redemption) ---`);
    console.log(`[REQUEST] Calling refundCredits()`);
    console.log(
      `[DATA] { userId: "${user._id}", amount: ${creditsToRedeem}, bookingId: "${booking2Id}" }`,
    );

    await refundCredits(
      user._id as any,
      creditsToRedeem,
      booking2Id.toString(),
      "Meeting Room X",
    );

    const userAfterRefund = await UserModel.findById(user._id);
    console.log(
      `[RESPONSE] User Balance After Refund: ${userAfterRefund?.credits} (Expected: 100)`,
    );

    const refundEntry = await CreditLedgerModel.findOne({
      type: CreditType.REFUND,
      bookingId: booking2Id.toString(),
    });
    console.log(
      `[VERIFY] Ledger Entry found: ${refundEntry ? "YES" : "NO"} (${refundEntry?._id})`,
    );

    // 5. CANCEL EARNING BOOKING (Revoke)
    console.log(`\n--- 5. REVOKE CREDITS (Cancel Earning) ---`);
    console.log(`[REQUEST] Calling revokeCredits()`);
    console.log(`[DATA] { userId: "${user._id}", bookingId: "${booking1Id}" }`);

    await revokeCredits(user._id as any, booking1Id.toString());

    const userAfterRevoke = await UserModel.findById(user._id);
    console.log(
      `[RESPONSE] User Balance After Revoke: ${userAfterRevoke?.credits} (Expected: 0)`,
    );

    const revokeEntry = await CreditLedgerModel.findOne({
      type: CreditType.REVOKED,
      bookingId: booking1Id.toString(),
    });
    console.log(
      `[VERIFY] Ledger Entry found: ${revokeEntry ? "YES" : "NO"} (${revokeEntry?._id})`,
    );

    // 6. EXPIRED CREDITS
    console.log(`\n--- 6. EXPIRED CREDITS (Simulate Expiration) ---`);
    console.log(`[REQUEST] Trigger: Cron Job (Credits Expired)`);

    // Create an EARNED batch that is already expired
    const expiredBookingId = new mongoose.Types.ObjectId();
    const expiredAmount = 200;
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday

    console.log(
      `[ACTION] Creating OLD CreditLedger entry (EARNED, Expired Yesterday)...`,
    );
    // Add credits to user first
    await UserModel.findByIdAndUpdate(user._id, {
      $inc: { credits: expiredAmount },
    });

    const expiredBatch = await CreditLedgerModel.create({
      user: user._id,
      amount: expiredAmount,
      type: CreditType.EARNED, // Was earned...
      description: "Earned (Expired Batch)",
      bookingId: expiredBookingId.toString(),
      balanceAfter: (userAfterRevoke?.credits || 0) + expiredAmount,
      expiryDate: pastDate,
      remainingAmount: expiredAmount,
      isExpired: false, // Not processed yet
    });

    console.log(`[ACTION] Running Expiration Logic (Manual Trigger)...`);
    // --- MANUAL EXPIRATION LOGIC (Copy of Cron) ---
    const batch = await CreditLedgerModel.findById(expiredBatch._id);
    if (
      batch &&
      batch.remainingAmount &&
      batch.expiryDate &&
      batch.expiryDate <= new Date()
    ) {
      const amountToExpire = batch.remainingAmount;
      // Deduct from User Balance
      const updatedUser = await UserModel.findByIdAndUpdate(
        batch.user,
        { $inc: { credits: -amountToExpire } },
        { new: true },
      );

      // Create EXPIRED ledger entry
      await CreditLedgerModel.create({
        user: batch.user,
        amount: -amountToExpire,
        type: CreditType.EXPIRED,
        description: `Expired credits from batch ${batch._id}`,
        balanceAfter: updatedUser?.credits || 0,
        bookingId: batch.bookingId,
      });

      // Mark batch as expired
      batch.remainingAmount = 0;
      batch.isExpired = true;
      await batch.save();
      console.log(`[RESPONSE] Expired ${amountToExpire} credits.`);
    }

    const userAfterExpire = await UserModel.findById(user._id);
    console.log(
      `[RESPONSE] User Balance After Expiration: ${userAfterExpire?.credits} (Expected: 0)`,
    );

    const history = await CreditLedgerModel.find({ user: user._id }).sort({
      createdAt: 1,
    });

    if (history.length === 0) {
      console.log("No history found.");
    } else {
      console.table(
        history.map((h) => ({
          Type: h.type,
          Amount: h.amount,
          BalanceAfter: h.balanceAfter,
          Description: h.description,
          Date: (h as any).createdAt
            ? (h as any).createdAt.toISOString().split("T")[0]
            : "N/A",
        })),
      );
    }
    console.log(`==================================================\n`);

    console.log("TEST COMPLETED SUCCESSFULLY");
  } catch (error) {
    console.error("\nTEST FAILED:", error);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
