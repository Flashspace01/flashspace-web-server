import { Request, Response } from "express";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { PayoutRequestModel, PayoutStatus } from "../models/payouts.models";

/**
 * Get Payout Stats
 * Returns: Total Earned, Total Paid, Pending Payout, Next Payout Date
 */
export const getPayoutStats = async (req: Request, res: Response) => {
    try {
        const matchQuery = {}; // Filter by affiliate user in real implementation

        // 1. Calculate Total Earned
        const allBookings = await BookingModel.find({
            ...matchQuery,
            status: { $nin: ['cancelled', 'pending_payment'] }
        }).populate("plan");

        let totalEarned = 0;
        allBookings.forEach(booking => {
            const plan = booking.plan as any;
            if (plan && plan.price) {
                totalEarned += (plan.price * 0.10); // 10% commission
            }
        });

        // 2. Calculate Total Paid & Pending
        const totalPaid = Math.floor(totalEarned * 0.80);
        const pendingPayout = totalEarned - totalPaid;

        // 3. Next Payout Date
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 10);

        return res.status(200).json({
            success: true,
            data: {
                totalEarned,
                totalPaid,
                pendingPayout,
                nextPayoutDate: "10th " + nextMonth.toLocaleString('default', { month: 'short' })
            }
        });

    } catch (error) {
        console.error("Error fetching payout stats:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Get Payouts List (Pending & Completed)
 */
export const getPayouts = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const query = userId ? { user: userId, isDeleted: false } : { isDeleted: false };

        const payouts = await PayoutRequestModel.find(query).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: payouts
        });

    } catch (error) {
        console.error("Error fetching payouts:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Request a New Payout
 */
export const requestPayout = async (req: Request, res: Response) => {
    try {
        const { amount, paymentMethod, bankDetails, upiId } = req.body;
        const userId = req.user?.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const payout = await PayoutRequestModel.create({
            user: userId,
            amount,
            paymentMethod,
            bankDetails, // Optional based on method
            upiId, // Optional based on method
            status: 'pending'
        });

        return res.status(201).json({
            success: true,
            message: "Payout request submitted successfully",
            data: payout
        });
    } catch (error) {
        console.error("Error creating payout request:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Update Payout Request
 */
export const updatePayout = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const payout = await PayoutRequestModel.findById(id);
        if (!payout) {
            return res.status(404).json({ success: false, message: "Payout request not found" });
        }

        if (payout.status !== 'pending') {
            return res.status(400).json({ success: false, message: "Cannot update processed or cancelled payouts" });
        }

        const updatedPayout = await PayoutRequestModel.findByIdAndUpdate(
            id,
            { ...updates },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Payout request updated successfully",
            data: updatedPayout
        });
    } catch (error) {
        console.error("Error updating payout:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Cancel Payout Request
 */
export const cancelPayout = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const payout = await PayoutRequestModel.findById(id);
        if (!payout) {
            return res.status(404).json({ success: false, message: "Payout request not found" });
        }

        if (payout.status === 'paid' || payout.status === 'processing') {
            return res.status(400).json({ success: false, message: "Cannot cancel processing/paid payouts" });
        }

        payout.status = PayoutStatus.CANCELLED;
        payout.isDeleted = true;
        await payout.save();

        return res.status(200).json({
            success: true,
            message: "Payout request cancelled successfully",
            data: payout
        });
    } catch (error) {
        console.error("Error cancelling payout:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
