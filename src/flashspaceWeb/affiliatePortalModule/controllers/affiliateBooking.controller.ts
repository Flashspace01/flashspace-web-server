import { Request, Response } from "express";
import mongoose from "mongoose";
import { BookingModel } from "../../bookingModule/booking.model";
import { UserModel } from "../../authModule/models/user.model";
import { calculateAffiliateCommission } from "../utils/affiliateCommission";

const formatTenure = (booking: any): string => {
  const tenure = booking.plan?.tenure;
  const unit = booking.plan?.tenureUnit || "months";
  if (!tenure) return "—";
  return `${tenure} ${unit}`;
};

const isRenewalDue = (booking: any): boolean => {
  if (booking.status !== "active" || !booking.endDate) return false;
  const endTime = new Date(booking.endDate).getTime();
  if (!Number.isFinite(endTime)) return false;
  const daysLeft = (endTime - Date.now()) / (1000 * 60 * 60 * 24);
  return daysLeft >= 0 && daysLeft <= 30;
};

export const getBookings = async (req: Request, res: Response) => {
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

    const userIds = [
      ...new Set(bookings.map((booking: any) => booking.user?.toString()).filter(Boolean)),
    ];

    const users = await UserModel.find({ _id: { $in: userIds } })
      .select("fullName email phoneNumber companyName")
      .lean();

    const userMap: Record<string, any> = {};
    users.forEach((user: any) => {
      userMap[user._id.toString()] = user;
    });

    const mappedBookings = bookings.map((booking: any) => {
      const user = userMap[booking.user?.toString() || ""] || {};
      const commission = calculateAffiliateCommission(booking);

      return {
        id: booking._id?.toString(),
        bookingNumber: booking.bookingNumber,
        client: {
          id: booking.user?.toString(),
          name: user.fullName || "Unknown Client",
          email: user.email || "—",
          phone: user.phoneNumber || "—",
        },
        company: user.companyName || user.fullName || "—",
        plan: booking.plan?.name || "—",
        space: booking.spaceSnapshot?.name || "—",
        city: booking.spaceSnapshot?.city || "—",
        area: booking.spaceSnapshot?.area || "—",
        duration: formatTenure(booking),
        amount: Number(booking.plan?.price || booking.plan?.finalPrice || 0),
        commission,
        status: booking.status,
        partnerKycStatus: booking.partnerKycStatus || "not_started",
        partnerReviewStatus: booking.partnerReviewStatus || "pending",
        couponCode: booking.couponCode || "—",
        startDate: booking.startDate,
        endDate: booking.endDate,
        createdAt: booking.createdAt,
      };
    });

    const stats = {
      totalBookings: mappedBookings.length,
      activeBookings: mappedBookings.filter((booking) => booking.status === "active").length,
      pendingBookings: mappedBookings.filter((booking) =>
        ["pending_payment", "pending_kyc"].includes(booking.status),
      ).length,
      renewalDue: bookings.filter(isRenewalDue).length,
      totalCommission: Number(
        mappedBookings.reduce((sum, booking) => sum + booking.commission, 0).toFixed(2),
      ),
    };

    return res.status(200).json({
      success: true,
      data: {
        bookings: mappedBookings,
        stats,
      },
    });
  } catch (error: any) {
    console.error("Error fetching affiliate bookings:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching bookings",
      error: error.message,
    });
  }
};

export const createBooking = async (req: Request, res: Response) => {
  try {
    const affiliateId = req.user?.id;
    if (!affiliateId) return res.status(401).json({ message: "Unauthorized" });

    const { AffiliateBookingModel } = await import("../models/affiliateBooking.model");
    const newBooking = await AffiliateBookingModel.create({ ...req.body, affiliateId });
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ message: "Error creating booking", error });
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { AffiliateBookingModel } = await import("../models/affiliateBooking.model");
    const booking = await AffiliateBookingModel.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Error fetching booking" });
  }
};
