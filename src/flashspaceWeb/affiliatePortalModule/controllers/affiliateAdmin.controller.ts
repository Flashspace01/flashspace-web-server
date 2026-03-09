import { Request, Response } from "express";
import { AffiliateLeadModel } from "../models/affiliateLead.model";
import { AffiliateBookingModel } from "../models/affiliateBooking.model";
import { UserModel, UserRole } from "../../authModule/models/user.model";

export class AffiliateAdminController {
  static async getAllAffiliates(req: Request, res: Response) {
    try {
      const affiliates = await UserModel.find({ role: UserRole.AFFILIATE });

      const formattedAffiliates = await Promise.all(
        affiliates.map(async (affiliate) => {
          const bookings = await AffiliateBookingModel.find({
            affiliateId: affiliate._id,
          });

          const totalClients = bookings.length;
          const totalRevenue = bookings.reduce(
            (sum, b) => sum + (b.bookingAmount || 0),
            0,
          );
          const totalCommission = bookings.reduce(
            (sum, b) => sum + (b.commissionAmount || 0),
            0,
          );

          return {
            _id: affiliate._id,
            fullName: affiliate.fullName,
            email: affiliate.email,
            phone: affiliate.phoneNumber || "",
            createdAt: affiliate.createdAt,
            isActive: affiliate.isActive,
            totalClients,
            totalRevenue,
            totalCommission,
            couponCode: null,
            couponUsageCount: 0,
          };
        }),
      );

      const totalAffiliates = formattedAffiliates.length;
      const totalRevenue = formattedAffiliates.reduce(
        (sum, a) => sum + a.totalRevenue,
        0,
      );
      const totalCommissionPayable = formattedAffiliates.reduce(
        (sum, a) => sum + a.totalCommission,
        0,
      );

      res.status(200).json({
        success: true,
        data: {
          affiliates: formattedAffiliates,
          totalAffiliates,
          totalRevenue,
          totalCommissionPayable,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching affiliates",
        error: error.message,
      });
    }
  }

  // GET /api/admin/affiliates/:id/stats
  static async getAffiliateStats(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [leadsCount, bookingsCount] = await Promise.all([
        AffiliateLeadModel.countDocuments({ affiliateId: id }),
        AffiliateBookingModel.countDocuments({ affiliateId: id }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          leadsCount,
          bookingsCount,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Error fetching affiliate stats",
        error: error.message,
      });
    }
  }
}
