import { Request, Response } from "express";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { UserModel } from "../../authModule/models/user.model";
import mongoose from "mongoose";

/**
 * GET /api/affiliate/clients
 * Returns all real bookings attributed to the logged-in affiliate
 * (i.e., bookings where `affiliateId` matches the affiliate's user id)
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

        // Merge user info into each booking for the response
        const clients = bookings.map((b) => {
            const user = userMap[b.user?.toString() || ""] || {};
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
                amount: b.plan?.price || 0,
                couponCode: b.couponCode || "—",
                status: b.status,
                startDate: b.startDate,
                endDate: b.endDate,
                createdAt: b.createdAt,
            };
        });

        // Summary stats
        const totalRevenue = clients.reduce((sum, c) => sum + c.amount, 0);
        const activeBookings = clients.filter((c) => c.status === "active").length;

        return res.status(200).json({
            success: true,
            data: {
                clients,
                stats: {
                    totalClients: clients.length,
                    totalRevenue,
                    activeBookings,
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
