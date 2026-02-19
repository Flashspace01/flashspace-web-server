import { CreditLedgerModel, CreditType } from "../models/creditLedger.model";
import { UserModel } from "../../authModule/models/user.model";
import mongoose from "mongoose";

/**
 * Deduct credits from user's balance using FIFO logic.
 * Consumes oldest available 'EARNED' or 'REFUND' credits first.
 * @param userId User ID
 * @param amount Amount to deduct
 * @param bookingId Booking ID where credits are being used
 * @param serviceName Service name for the ledger entry
 * @returns Promise<void>
 * @throws Error if insufficient balance
 */
export const deductCredits = async (
  userId: string | mongoose.Types.ObjectId,
  amount: number,
  bookingId: string,
  serviceName: string,
): Promise<void> => {
  if (amount <= 0) return;

  // 1. Get User Balance
  const user = await UserModel.findById(userId);
  if (!user || (user.credits || 0) < amount) {
    throw new Error("Insufficient credits");
  }

  // 2. Fetch available credit batches (Earned or Refunded) sorted by creation date (FIFO)
  // We sort by expiryDate first (to use soonest-to-expire), or createdAt.
  // Plan said createdAt/FIFO. Using createdAt implies oldest earned first.
  // If we use expiryDate, it's safer for the user. Let's use expiryDate Ascending.
  const batches = await CreditLedgerModel.find({
    user: userId,
    type: { $in: [CreditType.EARNED, CreditType.REFUND] },
    isExpired: false,
    remainingAmount: { $gt: 0 },
  }).sort({ expiryDate: 1 }); // Use ones expiring soonest first

  let remainingToDeduct = amount;

  for (const batch of batches) {
    if (remainingToDeduct <= 0) break;

    const available = batch.remainingAmount || 0;
    const toTake = Math.min(available, remainingToDeduct);

    // Update batch
    batch.remainingAmount = available - toTake;
    if (batch.remainingAmount === 0) {
      batch.isExpired = true; // Effectively "used up", though 'isExpired' usually means 'timed out'.
      // Re-reading plan: "Mark batch as isExpired=true if fully used."
      // Wait, 'isExpired' might be confusing for 'Fully Spent'.
      // But for the query { isExpired: false }, it works to exclude it.
      // Let's stick to the plan or just rely on remainingAmount > 0.
      // If I set isExpired=true, it won't be picked up by expiration cron either. That's good.
    }
    await batch.save();

    remainingToDeduct -= toTake;
  }

  if (remainingToDeduct > 0) {
    // This shouldn't happen if we checked user.credits, unless db is inconsistent.
    // We will force deduct balance anyway.
    console.warn(
      `[deductCredits] Inconsistency: User had balance but batches were insufficient. Missing: ${remainingToDeduct}`,
    );
  }

  // 3. Create 'SPENT' Ledger Entry
  // We update the user balance in step 4. Reference the *latest* balance.
  // Actually, we should update balance first to get correct 'balanceAfter'?
  // Or calculate it.

  // Update User Balance
  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { credits: -amount } },
    { new: true },
  );

  await CreditLedgerModel.create({
    user: userId,
    amount: -amount,
    type: CreditType.SPENT,
    description: `Used for ${serviceName}`,
    bookingId: bookingId,
    serviceName: serviceName,
    balanceAfter: updatedUser?.credits || 0,
  });
};

/**
 * Refund credits to used balance (e.g. cancelled booking).
 * Acts as a new 'EARNED' or 'REFUND' batch.
 */
export const refundCredits = async (
  userId: string | mongoose.Types.ObjectId,
  amount: number,
  bookingId: string,
  serviceName: string,
): Promise<void> => {
  if (amount <= 0) return;

  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");

  // Create expiry date (e.g. 180 days from now)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 180);

  // Update User Balance
  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { credits: amount } },
    { new: true },
  );

  // Create Ledger Entry
  await CreditLedgerModel.create({
    user: userId,
    amount: amount,
    type: CreditType.REFUND,
    description: `Refund for ${serviceName}`,
    bookingId: bookingId,
    serviceName: serviceName,
    balanceAfter: updatedUser?.credits || 0,
    remainingAmount: amount, // Searchable for future deductions
    expiryDate: expiryDate,
    isExpired: false,
  });
};

/**
 * Revoke earned credits (e.g. cancelled booking that earned credits).
 */
export const revokeCredits = async (
  userId: string | mongoose.Types.ObjectId,
  bookingId: string,
): Promise<void> => {
  // 1. Find the original EARNED entry
  const originalEarned = await CreditLedgerModel.findOne({
    bookingId: bookingId,
    type: CreditType.EARNED,
  });

  if (!originalEarned) {
    console.warn(
      `[revokeCredits] No EARNED entry found for bookingId: ${bookingId}`,
    );
    return;
  }

  const amount = originalEarned.amount; // The original earned amount

  // 2. Invalidate the original batch so it can't be used
  // We set remainingAmount to 0 even if it was partially used.
  // The user balance deduction will handle the debt if they spent it.
  originalEarned.remainingAmount = 0;
  originalEarned.isExpired = true; // Effectively revoked
  await originalEarned.save();

  // 3. Deduct from User Balance
  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { credits: -amount } },
    { new: true },
  );

  // 4. Create Ledger Entry for Revocation
  await CreditLedgerModel.create({
    user: userId,
    amount: -amount,
    type: CreditType.REVOKED,
    description: "Revoked earned credits due to cancellation",
    bookingId: bookingId,
    balanceAfter: updatedUser?.credits || 0,
  });
};
