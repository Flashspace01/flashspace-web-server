import { Request, Response } from "express";
import { BookingModel } from "../../bookingModule/booking.model";
import { InvoiceModel } from "../../invoiceModule/invoice.model";
import { UserModel } from "../../authModule/models/user.model";
import mongoose from "mongoose";

const COMMISSION_RATE = 0.15; // 15% commission as defined in affiliate dashboard

/**
 * GET /api/affiliate/invoices
 * Returns all invoices associated with bookings Referred/Tagged to the logged-in affiliate.
 */
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const affiliateId = req.user?.id;
    if (!affiliateId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const affObjectId = new mongoose.Types.ObjectId(affiliateId);

    // 1. Find all bookings referred by this affiliate
    const bookings = await BookingModel.find({
      affiliateId: affObjectId,
      isDeleted: false,
    })
      .select("_id bookingNumber plan spaceSnapshot user createdAt status")
      .lean();

    if (!bookings.length) {
      return res.status(200).json({
        success: true,
        data: {
          invoices: [],
          summary: {
            totalEarnings: 0,
            totalClients: 0,
          },
        },
      });
    }

    const bookingIds = bookings.map((b) => b._id.toString());
    const bookingMap = new Map(bookings.map((b) => [b._id.toString(), b]));

    // Fetch User Info to display Clients properly even if no invoice exists
    const userIds = [
      ...new Set(bookings.map((b) => b.user?.toString()).filter(Boolean)),
    ];
    const users = await UserModel.find({ _id: { $in: userIds } })
      .select("fullName email phoneNumber")
      .lean();
    const userMap: Record<string, any> = {};
    users.forEach((u: any) => {
      userMap[u._id.toString()] = u;
    });

    // 2. Find all invoices for these bookings
    const invoices = await InvoiceModel.find({
      booking: { $in: bookingIds },
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    const invoiceMap = new Map(
      invoices.map((inv) => [inv.booking?.toString() || "", inv]),
    );

    // 3. Map bookings to invoices (fallback to dummy if no invoice exists)
    const mappedInvoices = bookings.map((b: any) => {
      const inv = invoiceMap.get(b._id.toString());
      const user = userMap[b.user?.toString() || ""] || {};

      if (inv) {
        const paidAmount = inv.total || 0;
        const commission = parseFloat(
          (paidAmount * COMMISSION_RATE).toFixed(2),
        );
        return {
          ...inv,
          client:
            inv.billingAddress?.company ||
            inv.billingAddress?.name ||
            user.fullName ||
            "Client",
          clientAddress: [
            inv.billingAddress?.address,
            `${inv.billingAddress?.city || ""}, ${inv.billingAddress?.state || ""} ${inv.billingAddress?.pincode || ""}`,
          ].filter(Boolean),
          clientGstin: inv.billingAddress?.gstNumber || "N/A",
          amount: paidAmount,
          commission: commission,
          date: inv.createdAt,
          items:
            inv.lineItems?.map((item: any) => ({
              desc: item.description,
              qty: item.quantity,
              rate: item.rate,
              total: item.amount,
            })) || [],
        };
      } else {
        // Generate fallback invoice from booking
        const paidAmount = b.plan?.price || 0;
        const commission = parseFloat(
          (paidAmount * COMMISSION_RATE).toFixed(2),
        );
        const mockInvNum = b.bookingNumber
          ? b.bookingNumber.replace("FS-", "INV-")
          : `INV-MOCK-${b._id.toString().slice(-6).toUpperCase()}`;

        return {
          _id: b._id.toString(), // Use booking ID as dummy invoice ID
          invoiceNumber: mockInvNum,
          client: user.fullName || "Client",
          clientAddress: [], // Default empty or dummy
          clientGstin: "N/A",
          amount: paidAmount,
          commission: commission,
          date: b.createdAt,
          status: ["active", "completed"].includes(b.status)
            ? "paid"
            : "pending",
          items: [
            {
              desc: `${b.plan?.name || "Space Booking"} - ${b.spaceSnapshot?.name || ""}`,
              qty: 1,
              rate: paidAmount,
              total: paidAmount,
            },
          ],
        };
      }
    });

    const totalEarnings = mappedInvoices.reduce(
      (sum, inv) => sum + inv.commission,
      0,
    );

    return res.status(200).json({
      success: true,
      data: {
        invoices: mappedInvoices,
        summary: {
          totalEarnings: parseFloat(totalEarnings.toFixed(2)),
          totalClients: bookings.length,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching affiliate invoices:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
      error: error.message,
    });
  }
};

/**
 * GET /api/affiliate/invoices/:id
 */
export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const affiliateId = req.user?.id;
    const { id } = req.params;

    if (!affiliateId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let invoice = await InvoiceModel.findOne({
      _id: id,
      isDeleted: false,
    }).lean();
    let booking;

    if (!invoice) {
      // Check if this ID is actually a Booking ID (the fallback case)
      booking = await BookingModel.findOne({
        _id: id,
        affiliateId: new mongoose.Types.ObjectId(affiliateId),
        isDeleted: false,
      })
        .populate("user", "fullName email phoneNumber")
        .lean();

      if (!booking) {
        return res
          .status(404)
          .json({ success: false, message: "Invoice not found" });
      }

      // Generate fallback invoice details
      const user = (booking.user as any) || {};
      const paidAmount = booking.plan?.price || 0;
      const commission = parseFloat((paidAmount * COMMISSION_RATE).toFixed(2));
      const mockInvNum = booking.bookingNumber
        ? booking.bookingNumber.replace("FS-", "INV-")
        : `INV-MOCK-${booking._id.toString().slice(-6).toUpperCase()}`;

      const mappedInvoice = {
        _id: booking._id.toString(),
        invoiceNumber: mockInvNum,
        client: user.fullName || "Client",
        clientAddress: [],
        clientGstin: "N/A",
        amount: paidAmount,
        commission: commission,
        date: booking.createdAt,
        status: ["active", "completed"].includes(booking.status)
          ? "paid"
          : "pending",
        items: [
          {
            desc: `${booking.plan?.name || "Space Booking"} - ${booking.spaceSnapshot?.name || ""}`,
            qty: 1,
            rate: paidAmount,
            total: paidAmount,
          },
        ],
      };

      return res.status(200).json({
        success: true,
        data: mappedInvoice,
      });
    }

    // If it's a real invoice, verify this invoice belongs to a booking referred by this affiliate
    booking = await BookingModel.findOne({
      _id: invoice.booking,
      affiliateId: new mongoose.Types.ObjectId(affiliateId),
    }).lean();

    if (!booking) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const paidAmount = invoice.total || 0;
    const commission = parseFloat((paidAmount * COMMISSION_RATE).toFixed(2));

    const mappedInvoice = {
      ...invoice,
      client:
        invoice.billingAddress?.company ||
        invoice.billingAddress?.name ||
        "Client",
      clientAddress: [
        invoice.billingAddress?.address,
        `${invoice.billingAddress?.city || ""}, ${invoice.billingAddress?.state || ""} ${invoice.billingAddress?.pincode || ""}`,
      ].filter(Boolean),
      clientGstin: invoice.billingAddress?.gstNumber || "N/A",
      amount: paidAmount,
      commission: commission,
      date: invoice.createdAt,
      items:
        invoice.lineItems?.map((item: any) => ({
          desc: item.description,
          qty: item.quantity,
          rate: item.rate,
          total: item.amount,
        })) || [],
    };

    return res.status(200).json({
      success: true,
      data: mappedInvoice,
    });
  } catch (error: any) {
    console.error("Error fetching affiliate invoice detail:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoice detail",
      error: error.message,
    });
  }
};
