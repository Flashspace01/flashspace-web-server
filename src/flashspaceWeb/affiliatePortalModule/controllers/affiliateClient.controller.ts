import { Request, Response } from "express";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { UserModel } from "../../authModule/models/user.model";
import mongoose from "mongoose";

const COMMISSION_RATE = 0.15; // 15% commission on (paidAmount - discountAmount)

/**
 * GET /api/affiliate/clients
 * Returns all bookings attributed to the logged-in affiliate, with per-booking commission.
 * Commission = (paidAmount - discountAmount) * 15%
 */
export const getMyClients = async (req: Request, res: Response) => {
    try {
        const affiliateId = req.user?.id;

        if (!affiliateId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const bookings = await BookingModel.find({
            affiliateId: new mongoose.Types.ObjectId(affiliateId),
            isDeleted: false,
        })
            .sort({ createdAt: -1 })
            .lean();

        // Collect unique user IDs to fetch user info in one query
        const userIds = [...new Set(bookings.map((b) => b.user?.toString()).filter(Boolean))];

        const users = await UserModel.find({ _id: { $in: userIds } })
            .select("fullName email phoneNumber")
            .lean();

        const userMap: Record<string, any> = {};
        users.forEach((u: any) => {
            userMap[u._id.toString()] = u;
        });

        // Merge user info + compute commission per booking
        const clients = bookings.map((b: any) => {
            const user = userMap[b.user?.toString() || ""] || {};

            const paidAmount: number = b.plan?.price || 0;
            // plan.price is already the net amount (original - discount)
            // so Commission = paidAmount * 15%
            const commissionAmount = parseFloat((paidAmount * COMMISSION_RATE).toFixed(2));

            return {
                bookingId: b._id,
                bookingNumber: b.bookingNumber,
                user: {
                    id: b.user,
                    fullName: user.fullName || "Unknown",
                    email: user.email || "—",
                    phone: user.phoneNumber || "—",
                },
                space: b.spaceSnapshot?.name || "—",
                city: b.spaceSnapshot?.city || "—",
                plan: b.plan?.name || "—",
                tenure: b.plan?.tenure ? `${b.plan.tenure} months` : "—",
                amount: paidAmount,
                discountAmount: b.discountAmount || 0, // Keep discountAmount for display if needed
                commissionAmount,
                couponCode: b.couponCode || "—",
                status: b.status,
                startDate: b.startDate,
                endDate: b.endDate,
                createdAt: b.createdAt,
            };
        });

        // Summary stats
        const totalCommission = parseFloat(
            clients.reduce((sum, c) => sum + c.commissionAmount, 0).toFixed(2)
        );
        const activeBookings = clients.filter((c) => c.status === "active").length;
        const successfulBookings = clients.filter((c) =>
            ["active", "completed"].includes(c.status)
        ).length;

        return res.status(200).json({
            success: true,
            data: {
                clients,
                stats: {
                    totalClients: clients.length,
                    totalCommission,
                    activeBookings,
                    successfulBookings,
                    commissionRate: COMMISSION_RATE * 100,
                },
            },
        });
    } catch (error: any) {
        console.error("Error fetching affiliate clients:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch clients",
            error: error.message,
        });
    }
};
