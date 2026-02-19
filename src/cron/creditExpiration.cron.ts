import cron from "node-cron";
import {
  CreditLedgerModel,
  CreditType,
} from "../flashspaceWeb/userDashboardModule/models/creditLedger.model";
import { UserModel } from "../flashspaceWeb/authModule/models/user.model";

/**
 * Daily Job to expire credits that have passed their expiry date.
 * Runs at midnight (00:00) every day.
 */
export const initCreditExpirationJob = () => {
  console.log("Initializing Credit Expiration Cron Job...");

  // Schedule task to run at 00:00 every day
  cron.schedule("0 0 * * *", async () => {
    console.log("[Credit Expiration Job] Starting...");
    try {
      const now = new Date();

      // Find batches that are:
      // 1. Earned or Refunded (have expiry)
      // 2. Not yet marked as expired
      // 3. Have remaining amount > 0
      // 4. Expiry date is in the past
      const expiredBatches = await CreditLedgerModel.find({
        type: { $in: [CreditType.EARNED, CreditType.REFUND] },
        isExpired: false,
        remainingAmount: { $gt: 0 },
        expiryDate: { $lte: now },
      });

      console.log(
        `[Credit Expiration Job] Found ${expiredBatches.length} batches to expire.`,
      );

      for (const batch of expiredBatches) {
        const amountToExpire = batch.remainingAmount || 0;

        if (amountToExpire > 0) {
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
            bookingId: batch.bookingId, // Link to original booking if possible
          });

          // Mark batch as expired
          batch.remainingAmount = 0;
          batch.isExpired = true;
          await batch.save();

          console.log(
            `[Credit Expiration Job] Expired ${amountToExpire} credits for user ${batch.user}`,
          );
        }
      }

      console.log("[Credit Expiration Job] Completed.");
    } catch (error) {
      console.error("[Credit Expiration Job] Error:", error);
    }
  });
};
