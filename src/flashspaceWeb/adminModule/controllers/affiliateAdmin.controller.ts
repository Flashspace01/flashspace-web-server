import { Request, Response } from "express";
import { UserModel, UserRole } from "../../authModule/models/user.model";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { CouponModel } from "../../couponModule/coupon.model";
import mongoose from "mongoose";

const COMMISSION_RATE = 0.15;

/**
 * GET /api/admin/affiliates
 * Returns all affiliate users with summary stats
 */
export const getAllAffiliates = async (req: Request, res: Response) => {
    try {
        // Fetch all users with affiliate role
        const affiliates = await (UserModel as any).find({
            role: UserRole.AFFILIATE,
            isDeleted: { $ne: true },
        })
            .select("fullName email phoneNumber createdAt isActive")
            .lean();

        // Build ObjectId array for aggregation
        const affiliateObjectIds = affiliates.map(
            (a: any) => new mongoose.Types.ObjectId(a._id.toString())
        );

        const affiliateIdStrings: string[] = affiliates.map((a: any) => a._id.toString());

        // Get booking stats grouped by affiliateId
        const bookingStats = await (BookingModel as any).aggregate([
            {
                $match: {
                    affiliateId: { $in: affiliateObjectIds },
                    isDeleted: { $ne: true },
                },
            },
            {
                $group: {
                    _id: "$affiliateId",
                    totalBookings: { $sum: 1 },
                    totalRevenue: { $sum: "$plan.price" },
                },
            },
        ]);

        // Get coupon info for each affiliate
        const coupons = await (CouponModel as any).find({
            affiliateId: { $in: affiliateIdStrings },
            isAffiliateCoupon: true,
            isDeleted: { $ne: true },
        })
            .select("affiliateId code usedBy status")
            .lean();

        const couponMap: Record<string, any> = {};
        coupons.forEach((c: any) => {
            couponMap[c.affiliateId?.toString()] = c;
        });

        const statsMap: Record<string, any> = {};
        bookingStats.forEach((s: any) => {
            statsMap[s._id?.toString()] = s;
        });

        const result = affiliates.map((affiliate: any) => {
            const id = affiliate._id.toString();
            const stats = statsMap[id] || { totalBookings: 0, totalRevenue: 0 };
            const coupon = couponMap[id];
            const commission = parseFloat((stats.totalRevenue * COMMISSION_RATE).toFixed(2));

            return {
                _id: affiliate._id,
                fullName: affiliate.fullName,
                email: affiliate.email,
                phone: affiliate.phoneNumber || "—",
                createdAt: affiliate.createdAt,
                isActive: affiliate.isActive,
                totalClients: stats.totalBookings,
                totalRevenue: stats.totalRevenue,
                totalCommission: commission,
                couponCode: coupon?.code || null,
                couponUsageCount: coupon?.usedBy?.length || 0,
            };
        });

        // Sort by most clients first
        result.sort((a: any, b: any) => b.totalClients - a.totalClients);

        return res.status(200).json({
            success: true,
            data: {
                affiliates: result,
                totalAffiliates: result.length,
                totalRevenue: result.reduce((sum: number, a: any) => sum + (a.totalRevenue || 0), 0),
                totalCommissionPayable: result.reduce((sum: number, a: any) => sum + (a.totalCommission || 0), 0),
            },
        });
    } catch (error: any) {
        console.error("Error fetching affiliates:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch affiliates", error: error.message });
    }
};

/**
 * GET /api/admin/affiliates/:affiliateId/clients
 * Returns all clients (bookings) for a specific affiliate
 */
export const getAffiliateClients = async (req: Request, res: Response) => {
    try {
        const { affiliateId } = req.params;
        const affiliateIdStr: string = Array.isArray(affiliateId) ? affiliateId[0] : affiliateId;

        if (!mongoose.Types.ObjectId.isValid(affiliateIdStr)) {
            return res.status(400).json({ success: false, message: "Invalid affiliate ID" });
        }

        const affiliate = await (UserModel as any).findById(affiliateIdStr)
            .select("fullName email phoneNumber createdAt")
            .lean();

        if (!affiliate) {
            return res.status(404).json({ success: false, message: "Affiliate not found" });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const affiliateOid: any = new mongoose.Types.ObjectId(affiliateIdStr);
        const bookings = await (BookingModel as any).find({
            affiliateId: affiliateOid,
            isDeleted: { $ne: true },
        })
            .sort({ createdAt: -1 })
            .lean();

        // Fetch user info for the booking users
        const userIds = [...new Set((bookings as any[]).map((b: any) => b.user?.toString()).filter(Boolean))];
        const users = await (UserModel as any).find({ _id: { $in: userIds } })
            .select("fullName email phoneNumber")
            .lean();

        const userMap: Record<string, any> = {};
        (users as any[]).forEach((u: any) => {
            userMap[u._id.toString()] = u;
        });

        const clients = (bookings as any[]).map((b: any) => {
            const user = userMap[b.user?.toString() || ""] || {};
            const paidAmount: number = b.plan?.price || 0;
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
                commissionAmount,
                couponCode: b.couponCode || "—",
                status: b.status,
                createdAt: b.createdAt,
            };
        });

        const coupon = await (CouponModel as any).findOne({
            affiliateId: affiliateIdStr,
            isAffiliateCoupon: true,
            isDeleted: { $ne: true },
        }).lean();

        return res.status(200).json({
            success: true,
            data: {
                affiliate,
                coupon: coupon ? {
                    code: coupon.code,
                    usageCount: coupon.usedBy?.length || 0,
                    status: coupon.status,
                } : null,
                clients,
                stats: {
                    totalClients: clients.length,
                    totalRevenue: clients.reduce((sum: number, c: any) => sum + c.amount, 0),
                    totalCommission: parseFloat(clients.reduce((sum: number, c: any) => sum + c.commissionAmount, 0).toFixed(2)),
                },
            },
        });
    } catch (error: any) {
        console.error("Error fetching affiliate clients:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch affiliate clients", error: error.message });
    }
};
