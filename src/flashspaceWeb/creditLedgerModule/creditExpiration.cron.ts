import cron from "node-cron";
import mongoose from "mongoose";
import { CreditLedgerModel, CreditType } from "./creditLedger.model";
import { UserModel } from "../authModule/models/user.model";

export const initCreditExpirationJob = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("[CreditExpirationCron] Starting daily expiration check...");
    const now = new Date();

    try {
      // FIXED 1: Use Aggregation to group by user at the DB level (Prevents OOM crashes)
      const expiringUsers = await CreditLedgerModel.aggregate([
        {
          $match: {
            expiryDate: { $lt: now },
            remainingAmount: { $gt: 0 },
            isExpired: false,
            type: { $in: [CreditType.EARNED, CreditType.REFUND] },
          },
        },
        {
          $group: {
            _id: "$user", // Group by userId
            totalExpiring: { $sum: "$remainingAmount" },
            batchIds: { $push: "$_id" }, // Keep track of which batches to update
          },
        },
      ]);

      if (expiringUsers.length === 0) {
        console.log("[CreditExpirationCron] No credits to expire today.");
        return;
      }

      console.log(`[CreditExpirationCron] Processing expirations for ${expiringUsers.length} users.`);

      // Process each user safely
      for (const userGrp of expiringUsers) {
        // FIXED 2: Start an ACID Transaction to ensure financial data integrity
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // 1. Mark all eligible batches for this user as expired
          await CreditLedgerModel.updateMany(
            { _id: { $in: userGrp.batchIds } },
            { $set: { isExpired: true, remainingAmount: 0 } },
            { session }
          );

          // 2. Deduct from User Wallet
          const user = await UserModel.findByIdAndUpdate(
            userGrp._id,
            { $inc: { credits: -userGrp.totalExpiring } },
            { new: true, session }
          );

          if (!user) throw new Error(`User ${userGrp._id} not found`);

          // 3. Create the negative Ledger Entry
          await CreditLedgerModel.create(
            [
              {
                user: userGrp._id,
                amount: -userGrp.totalExpiring,
                type: CreditType.EXPIRED,
                description: `Expired ${userGrp.totalExpiring} credits (validity reached)`,
                balanceAfter: user.credits,
              },
            ],
            { session } // Pass session in array format for Mongoose create
          );

          // Commit the transaction only if all 3 steps succeeded
          await session.commitTransaction();
          console.log(`[CreditExpirationCron] Successfully expired ${userGrp.totalExpiring} credits for User ${userGrp._id}`);
          
        } catch (txnError) {
          // If ANYTHING fails, abort everything. No ghost deductions!
          await session.abortTransaction();
          console.error(`[CreditExpirationCron] Transaction failed for user ${userGrp._id}. Rolled back.`, txnError);
        } finally {
          session.endSession();
        }
      }

      console.log("[CreditExpirationCron] Expiration check completed successfully.");
    } catch (error) {
      console.error("[CreditExpirationCron] Fatal error in cron job:", error);
    }
  });

  console.log("[CreditExpirationCron] Daily credit expiration job scheduled.");
};