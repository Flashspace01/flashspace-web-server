import { Request, Response } from "express";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { UserModel } from "../../authModule/models/user.model";

/**
 * Get Dashboard Stats
 * Returns: Active Bookings, Pending Activation, Renewals Due, Total Commissions
 */
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const matchQuery = {}; // Using all bookings for now until referral logic is added

        const activeBookings = await BookingModel.countDocuments({
            ...matchQuery,
            status: "active"
        });

        const pendingActivation = await BookingModel.countDocuments({
            ...matchQuery,
            status: { $in: ["pending_kyc", "pending_payment"] }
        });

        // Renewals due in next 30 days
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const renewalsDue = await BookingModel.countDocuments({
            ...matchQuery,
            status: "active",
            endDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
        });

        // Calculate Total Commissions (Mock logic: 10% of plan price)
        const allBookings = await BookingModel.find({ ...matchQuery, status: "active" }).populate("plan");
        let totalCommissions = 0;

        allBookings.forEach(booking => {
            const plan = booking.plan as any;
            if (plan && plan.price) {
                totalCommissions += (plan.price * 0.10);
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                activeBookings,
                pendingActivation,
                renewalsDue,
                totalCommissions
            }
        });

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Get All Bookings (Paginated & Filtered)
 */
export const getAllBookings = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const status = req.query.status as string;
        const search = req.query.search as string;

        const skip = (page - 1) * limit;

        // Build Query
        const query: any = {};

        if (status && status !== "all") {
            if (status === "renewals") {
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                query.status = "active";
                query.endDate = { $lte: thirtyDaysFromNow, $gte: new Date() };
            } else {
                query.status = status;
            }
        }

        // Search by Booking ID or Company Name (User's name/company)
        if (search) {
            query.$or = [
                { bookingNumber: { $regex: search, $options: "i" } }
            ];
        }

        const bookings = await BookingModel.find(query)
            .populate("user", "fullName email businessInfo")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await BookingModel.countDocuments(query);

        // Transform data for UI
        const formattedBookings = bookings.map(booking => {
            const plan = booking.plan as any;
            const commission = plan?.price ? plan.price * 0.10 : 0;
            const userObj = booking.user as any;

            return {
                id: booking._id,
                bookingId: booking.bookingNumber,
                company: userObj?.businessInfo?.companyName || userObj?.fullName || "N/A",
                plan: plan?.name || "N/A",
                location: `${booking.spaceSnapshot?.city || ''} - ${booking.spaceSnapshot?.area || ''}`,
                startDate: booking.startDate,
                endDate: booking.endDate,
                commission: commission,
                status: booking.status
            };
        });

        return res.status(200).json({
            success: true,
            data: formattedBookings,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });

    } catch (error) {
        console.error("Error fetching bookings:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Get Single Booking Details
 */
export const getBookingById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const booking = await BookingModel.findById(id).populate("user").populate("documents");

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        return res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.error("Error fetching booking details:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Create a New Booking
 */
export const createBooking = async (req: Request, res: Response) => {
    try {
        const {
            user,
            type,
            spaceId,
            plan,
            status,
            startDate,
            endDate
        } = req.body;

        if (!user || !type || !spaceId || !plan) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const count = await BookingModel.countDocuments();
        const bookingNumber = `FS-MAN-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

        const newBooking = await BookingModel.create({
            bookingNumber,
            user,
            type,
            spaceId,
            plan,
            status: status || "pending_payment",
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            createdAt: new Date(),
            isDeleted: false
        });

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: newBooking
        });
    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Update a Booking
 */
export const updateBooking = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const booking = await BookingModel.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.status(200).json({
            success: true,
            message: "Booking updated successfully",
            data: booking
        });
    } catch (error) {
        console.error("Error updating booking:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Delete a Booking
 */
export const deleteBooking = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Soft delete
        const booking = await BookingModel.findByIdAndUpdate(
            id,
            { isDeleted: true, status: 'cancelled', updatedAt: new Date() },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.status(200).json({
            success: true,
            message: "Booking deleted successfully",
            data: booking
        });
    } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
