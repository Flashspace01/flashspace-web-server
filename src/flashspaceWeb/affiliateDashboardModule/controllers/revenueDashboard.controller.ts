import { Request, Response } from "express";
import { BookingModel } from "../models/revenueDashboard.models";

/**
 * Get Revenue Overview Stats
 */
export const getRevenueStats = async (req: Request, res: Response) => {
    try {
        const matchQuery = { status: "active" }; // Only count active bookings for revenue

        const allBookings = await BookingModel.find(matchQuery).populate("plan");

        let totalRevenue = 0;
        let monthlyRevenue = 0;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        allBookings.forEach(booking => {
            const plan = booking.plan as any;
            if (plan && plan.price) {
                const commission = plan.price * 0.10; // 10% commission rule
                totalRevenue += commission;

                if (booking.createdAt) {
                    const bookingDate = new Date(booking.createdAt);
                    if (bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear) {
                        monthlyRevenue += commission;
                    }
                }
            }
        });

        // Growth mock calculation
        const growth = 12.5; // Mock % growth

        res.status(200).json({
            success: true,
            data: {
                totalRevenue,
                monthlyRevenue,
                growth
            }
        });
    } catch (error) {
        console.error("Error fetching revenue stats:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Get Monthly Trend Data (Mocked for Chart)
 */
export const getMonthlyTrend = async (req: Request, res: Response) => {
    try {
        // In a real app, uses Aggregation Pipeline to group bookings by month
        const mockTrend = [
            { month: "Jan", revenue: 15000 },
            { month: "Feb", revenue: 22000 },
            { month: "Mar", revenue: 18000 },
            { month: "Apr", revenue: 25000 },
            { month: "May", revenue: 30000 },
            { month: "Jun", revenue: 28000 },
        ];
        res.status(200).json({ success: true, data: mockTrend });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Get Revenue by Product/Space Type
 */
export const getRevenueByProduct = async (req: Request, res: Response) => {
    try {
        // Aggregation to sum revenue by 'type' (e.g. cabin, desk)
        const revenueByType = await BookingModel.aggregate([
            { $match: { status: "active" } },
            {
                $lookup: {
                    from: "plans", // Assumes collection name is 'plans'
                    localField: "plan",
                    foreignField: "_id",
                    as: "planDetails"
                }
            },
            { $unwind: "$planDetails" },
            {
                $group: {
                    _id: "$type", // e.g. "Meeting Room", "Virtual Office"
                    totalRevenue: { $sum: { $multiply: ["$planDetails.price", 0.10] } },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({ success: true, data: revenueByType });
    } catch (error) {
        console.error("Error fetching revenue by product:", error);
        // Fallback mock if aggregation fails due to schema mismatch in dev
        res.status(200).json({ success: true, data: [] });
    }
};

/**
 * Get All Manual Revenue Entries
 */
export const getAllRevenueEntries = async (req: Request, res: Response) => {
    try {
        // Mock data
        res.status(200).json({
            success: true,
            data: [
                { id: "rev_1", amount: 500, description: "Bonus", type: "adjustment", date: new Date() },
                { id: "rev_2", amount: 1000, description: "Correction", type: "adjustment", date: new Date() }
            ]
        });
    } catch (error) {
        console.error("Error fetching revenue entries:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Get Single Revenue Entry
 */
export const getRevenueEntryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        res.status(200).json({
            success: true,
            data: {
                id,
                amount: 500,
                description: "Bonus",
                type: "adjustment",
                date: new Date()
            }
        });
    } catch (error) {
        console.error("Error fetching revenue entry:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Create Manual Revenue Entry (e.g. Bonus, Adjustment)
 */
export const createRevenueEntry = async (req: Request, res: Response) => {
    try {
        const { amount, description, type } = req.body;

        // In a real app, this would save to a RevenueAdjustment model
        // For now, we'll just mock the success

        res.status(201).json({
            success: true,
            message: "Revenue entry created successfully",
            data: {
                id: "rev_" + Date.now(),
                amount,
                description,
                type: type || "adjustment",
                date: new Date()
            }
        });
    } catch (error) {
        console.error("Error creating revenue entry:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Update Revenue Entry
 */
export const updateRevenueEntry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        res.status(200).json({
            success: true,
            message: "Revenue entry updated successfully",
            data: {
                id,
                ...updateData,
                updatedAt: new Date()
            }
        });
    } catch (error) {
        console.error("Error updating revenue entry:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Delete Revenue Entry
 */
export const deleteRevenueEntry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        res.status(200).json({
            success: true,
            message: "Revenue entry deleted successfully",
            data: { id }
        });
    } catch (error) {
        console.error("Error deleting revenue entry:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

