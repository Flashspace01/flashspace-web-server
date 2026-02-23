import { Request, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { PaymentModel, PaymentStatus, PaymentType } from "./payment.model";
import { BookingModel } from "../bookingModule/booking.model";
import { InvoiceModel } from "../invoiceModule/invoice.model";
import { KYCDocumentModel } from "../userDashboardModule/models/kyc.model";
import { VirtualOfficeModel } from "../virtualOfficeModule/virtualOffice.model";
import { CoworkingSpaceModel } from "../coworkingSpaceModule/coworkingSpace.model";
import { MeetingRoomModel } from "../meetingRoomModule/meetingRoom.model";
import { UserModel } from "../authModule/models/user.model";
import {
  CreditLedgerModel,
  CreditType,
} from "../creditLedgerModule/creditLedger.model";
import {
  NotificationModel,
  NotificationType,
  NotificationRecipientType,
} from "../notificationModule/models/Notification";
import { getIO } from "../../socket";
import { BookingService } from "../seatingModule/seating.service";

// Initialize Razorpay with API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// Helper function to create booking and invoice after payment
async function createBookingAndInvoice(payment: any) {
  try {
    // If it's a seat booking, confirm the hold first
    if (payment.paymentType === PaymentType.SEAT_BOOKING && payment.holdId) {
      try {
        await BookingService.confirmBooking(
          payment.holdId,
          payment.userId,
          payment.razorpayPaymentId,
        );
      } catch (confirmError) {
        console.error("Error confirming seat booking hold:", confirmError);
        // We continue anyway to generate invoice, but log the error
      }
    }

    // Generate booking number (VIRTUAL_OFFICE, COWORKING_SPACE, MEETING_ROOM)
    // For SEAT_BOOKING we might still want a booking number for the invoice,
    // but the SeatBooking model already has its own logic if needed?
    // Actually, simple FS number is fine for internal tracking.
    const bookingCount = await BookingModel.countDocuments();
    const bookingNumber = `FS-${new Date().getFullYear()}-${String(bookingCount + 1).padStart(5, "0")}`;

    // Get space details for snapshot
    let spaceSnapshot: any = {
      _id: payment.spaceId,
      name: payment.spaceName,
    };

    if (payment.paymentType === PaymentType.VIRTUAL_OFFICE) {
      const space = await VirtualOfficeModel.findById(payment.spaceId).populate(
        "property",
      );
      if (space) {
        spaceSnapshot = {
          _id: space._id?.toString(),
          name: (space.property as any).name,
          address: (space.property as any).address,
          city: (space.property as any).city,
          area: (space.property as any).area,
          image: (space.property as any).images?.[0] || "",
          coordinates: (space.property as any).location?.coordinates || [],
        };
      }
    } else if (payment.paymentType === PaymentType.COWORKING_SPACE) {
      const space = await CoworkingSpaceModel.findById(
        payment.spaceId,
      ).populate("property");
      if (space) {
        spaceSnapshot = {
          _id: space._id?.toString(),
          name: (space.property as any).name,
          address: (space.property as any).address,
          city: (space.property as any).city,
          area: (space.property as any).area,
          image: (space.property as any).images?.[0] || "",
          coordinates: (space.property as any).location?.coordinates || [],
        };
      }
    } else if (payment.paymentType === PaymentType.MEETING_ROOM) {
      const space = await MeetingRoomModel.findById(payment.spaceId).populate(
        "property",
      );
      if (space) {
        spaceSnapshot = {
          _id: space._id?.toString(),
          name: (space.property as any).name,
          address: (space.property as any).address,
          city: (space.property as any).city,
          area: (space.property as any).area,
          image: (space.property as any).images?.[0] || "",
          coordinates: (space.property as any).location?.coordinates || [],
        };
      }
    } else if (payment.paymentType === PaymentType.MEETING_ROOM) {
      const space = await MeetingRoomModel.findById(payment.spaceId);
      if (space) {
        spaceSnapshot = {
          _id: space._id?.toString(),
          name: space.name,
          address: space.address,
          city: space.city,
          area: space.area,
          image: space.images?.[0] || "",
          coordinates: space.location?.coordinates || [],
        };
      }
    }

    // Get partner ID from the space model directly (used for security & fast queries)
    let partnerId;
    if (payment.paymentType === PaymentType.VIRTUAL_OFFICE) {
      const space = await VirtualOfficeModel.findById(payment.spaceId);
      partnerId = space?.partner;
    } else if (payment.paymentType === PaymentType.COWORKING_SPACE) {
      const space = await CoworkingSpaceModel.findById(payment.spaceId);
      partnerId = space?.partner;
    } else if (payment.paymentType === PaymentType.MEETING_ROOM) {
      const space = await MeetingRoomModel.findById(payment.spaceId);
      partnerId = space?.partner;
    }

    // Fallback: If no partner is assigned to the space, find the first admin to assign as partner
    // This prevents booking failure when space data is incomplete.
    if (!partnerId) {
      console.warn(`Partner ID not found for space ${payment.spaceId}. Falling back to first admin.`);
      const adminUser = await UserModel.findOne({ role: UserRole.ADMIN, isDeleted: { $ne: true } });
      if (adminUser) {
        partnerId = adminUser._id;
      } else {
        // Last resort: Use the user themselves or keep undefined if we really have no admins (unlikely)
        console.error("No admin found for fallback. Booking might still fail validation.");
      }
    }

    // 2. Resolve Partner ID from the space
    let partnerId = null;
    if (payment.paymentType === PaymentType.VIRTUAL_OFFICE) {
      const space = await VirtualOfficeModel.findById(payment.spaceId);
      partnerId = space?.partner;
    } else if (payment.paymentType === PaymentType.COWORKING_SPACE) {
      const space = await CoworkingSpaceModel.findById(payment.spaceId);
      partnerId = space?.partner;
    } else if (payment.paymentType === PaymentType.MEETING_ROOM) {
      const space = await MeetingRoomModel.findById(payment.spaceId);
      partnerId = space?.partner;
    } else if (payment.paymentType === PaymentType.SEAT_BOOKING) {
      const space = await CoworkingSpaceModel.findById(payment.spaceId);
      partnerId = space?.partner;
    }

    // Default to a system admin or seller if partnerId is still missing to avoid validation failure
    if (!partnerId) {
      console.warn(
        `Partner ID not found for space ${payment.spaceId}. Defaulting to seller...`,
      );
      // In a real system, you'd have a default system admin ID here.
      // For now, we'll try to use the space's partner if possible, or leave as null (which triggers warning)
      // but the Invoice model REQUIREs it, so we MUST provide a valid ObjectId.
      // We will use the ADMIN's ID if we can find one, or fallback to the userId (self-billing) as a last resort to prevent crash.
      partnerId = payment.userId;
    }

    // Calculate dates
    const startDate = payment.startDate
      ? new Date(payment.startDate)
      : new Date();
    let endDate = new Date(startDate);

    // For seat_booking, endDate is handled differently, but we'll set a fallback
    // We assume tenure is 0 if it's a seat booking (or hour-based).
    if (payment.paymentType !== "seat_booking") {
      endDate.setMonth(endDate.getMonth() + payment.tenure * 12); // tenure in years
    } else {
      endDate.setHours(endDate.getHours() + payment.tenure); // tenure as hours
    }

    // Create booking (Only if not seat_booking, or if we still want a BookingModel for invoices)
    let booking: any = null;
    if (payment.paymentType !== "seat_booking") {
      booking = await BookingModel.create({
        bookingNumber,
        user: payment.userId,
        type:
          payment.paymentType === PaymentType.VIRTUAL_OFFICE
            ? "virtual_office"
            : payment.paymentType === PaymentType.MEETING_ROOM
              ? "meeting_room"
              : "coworking_space",
        spaceId: payment.spaceId,
        partnerId: partnerId, // Explicitly set the partner!
        spaceSnapshot,
        plan: {
          name: payment.planName,
          price: payment.totalAmount,
          originalPrice: payment.yearlyPrice * payment.tenure,
          discount: payment.discountAmount || 0,
          tenure: payment.tenure * 12,
          tenureUnit: "months",
        },
        paymentId: payment._id?.toString(),
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        status: "pending_kyc",
        kycStatus: "not_started",
        timeline: [
          {
            status: "payment_received",
            date: new Date(),
            note: `Payment of ₹${payment.totalAmount} received`,
            by: "System",
          },
        ],
        documents: [],
        startDate,
        endDate,
        autoRenew: false,
        features: [
          "Business Address",
          "Mail Handling",
          "GST Registration Support",
        ],
      });
    } // End of BookingModel creation

    // Generate invoice number
    // Collision-safe invoice number (same approach as booking number)
    const lastInvoice = await InvoiceModel.findOne({}, { invoiceNumber: 1 })
      .sort({ createdAt: -1 })
      .lean();
    const invYear = new Date().getFullYear();
    let nextInvSeq = 1;
    if (lastInvoice?.invoiceNumber) {
      const parts = lastInvoice.invoiceNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextInvSeq = lastSeq + 1;
    }
    const invoiceNumber = `INV-${invYear}-${String(nextInvSeq).padStart(5, "0")}`;

    // Calculate tax (18% GST)
    const subtotal = payment.totalAmount;
    const taxRate = 18;
    const taxAmount = Math.round((subtotal * taxRate) / 118); // Extract GST from inclusive price
    const baseAmount = subtotal - taxAmount;

    // Create invoice
    await InvoiceModel.create({
      invoiceNumber,
      user: payment.userId,
      partnerId: partnerId, // <--- FIXED: Added missing partnerId
      bookingId: booking ? booking._id?.toString() : undefined,
      bookingNumber,
      paymentId: payment._id?.toString(),
      description: `${payment.spaceName} - ${payment.planName} (${payment.tenure} Year${payment.tenure > 1 ? "s" : ""})`,
      lineItems: [
        {
          description: `${payment.planName} - ${payment.tenure} Year${payment.tenure > 1 ? "s" : ""}`,
          quantity: 1,
          rate: baseAmount,
          amount: baseAmount,
        },
      ],
      subtotal: baseAmount,
      taxRate,
      taxAmount,
      total: subtotal,
      status: "paid",
      paidAt: new Date(),
      billingAddress: {
        name: payment.userName,
        company: "",
        address: "",
        city: spaceSnapshot.city || "",
      },
    });

    // Create/update KYC record (skipping for seat_booking to simplify, or maybe keep it if needed)
    let kyc = await KYCDocumentModel.findOne({ user: payment.userId });
    if (!kyc && booking) {
      kyc = await KYCDocumentModel.create({
        user: payment.userId,
        bookingId: booking._id?.toString(),
        personalInfo: {
          fullName: payment.userName,
          email: payment.userEmail,
          phone: payment.userPhone,
          verified: true,
        },
        overallStatus: "not_started",
        progress: 25,
      });
    }

    // Credits & Rewards Logic - Updated: 1% Earning on ALL spends
    const earningsRate = 0.01;
    const creditsEarned = Math.floor(payment.totalAmount * earningsRate);

    if (creditsEarned > 0) {
      // Update User credits
      await UserModel.findByIdAndUpdate(payment.userId, {
        $inc: { credits: creditsEarned },
      });

      // Get updated user for ledger record
      const updatedUser = await UserModel.findById(payment.userId);

      // Create Ledger Entry for Earning
      await CreditLedgerModel.create({
        user: payment.userId,
        amount: creditsEarned,
        type: CreditType.EARNED,
        description: `Earned credits (1%) for booking #${bookingNumber}`,
        referenceId: booking
          ? booking._id?.toString()
          : payment._id?.toString(),
        bookingId: booking ? booking._id : undefined,
        balanceAfter: updatedUser?.credits || 0,
      });
    }

    // Credits Deduction if used
    if (payment.creditsUsed && payment.creditsUsed > 0) {
      // Deduct Credits
      await UserModel.findByIdAndUpdate(payment.userId, {
        $inc: { credits: -payment.creditsUsed },
      });

      // Get updated user for ledger record
      const updatedUser = await UserModel.findById(payment.userId);

      // Create Ledger Entry for Spend
      await CreditLedgerModel.create({
        user: payment.userId,
        amount: -payment.creditsUsed,
        type: CreditType.SPENT,
        description: `Used credits for meeting room booking #${bookingNumber}`,
        referenceId: booking
          ? booking._id?.toString()
          : payment._id?.toString(),
        bookingId: booking ? booking._id : undefined,
        balanceAfter: updatedUser?.credits || 0,
      });
    }

    return { booking, invoiceNumber };
  } catch (error) {
    console.error("Error creating booking/invoice:", error);
    throw error;
  }
}

/**
 * Create a new Razorpay order
 * POST /api/payment/create-order
 */
export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      userEmail,
      userName,
      userPhone,
      spaceId,
      spaceName,
      planName,
      planKey,
      tenure,
      yearlyPrice,
      totalAmount,
      discountPercent,
      discountAmount,
      paymentType = PaymentType.VIRTUAL_OFFICE,
      startDate,
      couponCode,
      affiliateId,
      holdId,
      creditsToUse = 0,
    } = req.body;

    // Validation
    if (
      !userId ||
      !userEmail ||
      !spaceId ||
      !planName ||
      !tenure ||
      !totalAmount
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        error:
          "userId, userEmail, spaceId, planName, tenure, and totalAmount are required",
      });
    }

    // Verify credits if being used
    let adjustedTotalAmount = totalAmount;
    if (creditsToUse > 0) {
      if (paymentType !== PaymentType.MEETING_ROOM) {
        return res.status(400).json({
          success: false,
          message: "Credits can only be used for meeting room bookings",
        });
      }

      const user = await UserModel.findById(userId);
      if (!user || user.credits < creditsToUse) {
        return res.status(400).json({
          success: false,
          message: "Insufficient credits",
        });
      }

      if (creditsToUse > totalAmount) {
        return res.status(400).json({
          success: false,
          message: "Credits used cannot exceed total amount",
        });
      }

      adjustedTotalAmount = totalAmount - creditsToUse;
    }

    // Check Razorpay Keys
    let razorpayOrder;

    if (
      process.env.RAZORPAY_KEY_ID === "secret-id" ||
      !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      console.warn(
        "Razorpay keys missing - Switching to DEV MODE (Mock Order)",
      );
      razorpayOrder = {
        id: `order_mock_${Date.now()}`,
        amount: Math.round(adjustedTotalAmount * 100),
        currency: "INR",
      };
    } else {
      // Create Razorpay order (receipt max 40 chars)
      const receiptId = `ord_${Date.now().toString(36)}`;
      try {
        razorpayOrder = await razorpay.orders.create({
          amount: Math.round(adjustedTotalAmount * 100), // Convert to paise and ensure integer
          currency: "INR",
          receipt: receiptId,
          notes: {
            spaceId,
            spaceName: spaceName.substring(0, 40), // Truncate to fit limits if needed
            planName: planName.substring(0, 40),
            tenure: tenure.toString(),
            userId,
          },
        });
      } catch (rzpError: any) {
        console.error("Razorpay Order Create Error:", rzpError);
        return res.status(502).json({
          success: false,
          message: "Payment Gateway Error",
          error: rzpError.error?.description || rzpError.message,
        });
      }
    }

    // Save order to database
    const payment = await PaymentModel.create({
      userId,
      userEmail,
      userName: userName || "Guest",
      userPhone,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount, // matches created amount
      currency: "INR",
      status: PaymentStatus.PENDING,
      paymentType,
      spaceId,
      spaceName,
      planName,
      planKey,
      tenure,
      yearlyPrice,
      totalAmount,
      discountPercent: discountPercent || 0,
      discountAmount: discountAmount || 0,
      startDate: startDate ? new Date(startDate) : undefined,
      couponCode: couponCode || undefined,
      affiliateId: affiliateId || undefined,
      holdId,
      creditsUsed: creditsToUse,
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        paymentId: payment._id,
        keyId: process.env.RAZORPAY_KEY_ID,
        devMode: false,
      },
    });
  } catch (error: any) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

/**
 * Verify payment after Razorpay callback
 * POST /api/payment/verify
 */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      devMode, // For development testing
    } = req.body;

    // DEV MODE: Skip signature verification for development
    if (devMode === true) {
      const payment = await PaymentModel.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id || `pay_dev_${Date.now()}`,
          razorpaySignature: razorpay_signature || "dev_signature",
          status: PaymentStatus.COMPLETED,
        },
        { new: true },
      );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment order not found",
        });
      }

      // Create booking and invoice
      let bookingData = null;
      try {
        bookingData = await createBookingAndInvoice(payment);

        // --- NOTIFICATION LOGIC (DEV MODE) ---
        await NotificationService.notifyUser(
          payment.userId.toString(),
          "Booking Confirmed! 🎉",
          `Your booking for ${payment.spaceName} has been successfully confirmed.`,
          NotificationType.SUCCESS,
          {
            bookingId: bookingData?.booking?._id,
            paymentId: payment._id,
            type: "booking_confirmation",
          }
        );

        if (bookingData?.invoiceNumber) {
          await NotificationService.notifyUser(
            payment.userId.toString(),
            "Invoice Generated 📄",
            `Your invoice ${bookingData.invoiceNumber} for ${payment.spaceName} is now available to download.`,
            NotificationType.INFO,
            {
              invoiceNumber: bookingData.invoiceNumber,
              type: "invoice_generated",
              actionUrl: "/dashboard/documents"
            }
          );
        }
        // -------------------------------------
      } catch (err: any) {
        console.error("Failed to create booking:", err);
      }

      // --- MARK COUPON AS USED (DEV MODE) ---
      if (payment.couponCode) {
        try {
          const coupon = await CouponModel.findOne({ code: payment.couponCode, isDeleted: { $ne: true } });
          if (coupon) {
            if (coupon.isAffiliateCoupon) {
              await CouponModel.updateOne(
                { _id: coupon._id },
                { $addToSet: { usedBy: payment.userId.toString() } }
              );
            } else {
              coupon.status = CouponStatus.USED;
              coupon.usedAt = new Date();
              coupon.usedBy = [...(coupon.usedBy || []), payment.userId.toString()];
              await coupon.save();
            }
          }
        } catch (couponErr) {
          console.error("Failed to mark coupon as used in DEV MODE:", couponErr);
        }
      }
      // -------------------------------------

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully (DEV MODE)",
        data: {
          paymentId: payment._id,
          orderId: payment.razorpayOrderId,
          status: payment.status,
          spaceName: payment.spaceName,
          planName: payment.planName,
          tenure: payment.tenure,
          totalAmount: payment.totalAmount,
          bookingNumber: bookingData?.booking?.bookingNumber,
          invoiceNumber: bookingData?.invoiceNumber,
          devMode: true,
        },
      });
    }

    // PRODUCTION MODE: Normal verification
    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification details",
      });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      // Update payment status to failed
      await PaymentModel.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          status: PaymentStatus.FAILED,
          errorMessage: "Signature verification failed",
        },
      );

      return res.status(400).json({
        success: false,
        message: "Payment verification failed - Invalid signature",
      });
    }

    // Update payment to completed
    const payment = await PaymentModel.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: PaymentStatus.COMPLETED,
      },
      { new: true },
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found",
      });
    }

    // Create booking and invoice
    let bookingData = null;
    try {
      bookingData = await createBookingAndInvoice(payment);

      // --- NOTIFICATION LOGIC (PROD MODE) ---
      const notification = await NotificationModel.create({
        recipient: payment.userId,
        recipientType: NotificationRecipientType.USER,
        type: NotificationType.SUCCESS,
        title: "Booking Confirmed! 🎉",
        message: `Your booking for ${payment.spaceName} has been successfully confirmed.`,
        read: false,
        metadata: {
          bookingId: bookingData?.booking?._id || payment._id,
          paymentId: payment._id,
          type: "booking_confirmation",
        },
      });

      // Emit Socket Event
      try {
        const io = getIO();
        io.to(payment.userId.toString()).emit("notification:new", notification);
      } catch (socketError) {
        console.error("Socket emission failed:", socketError);
      }
      // -------------------------------------
    } catch (err: any) {
      console.error("Failed to create booking:", err);
    }

    // --- MARK COUPON AS USED (PROD MODE) ---
    if (payment.couponCode) {
      try {
        const coupon = await CouponModel.findOne({ code: payment.couponCode, isDeleted: { $ne: true } });
        if (coupon) {
          if (coupon.isAffiliateCoupon) {
            await CouponModel.updateOne(
              { _id: coupon._id },
              { $addToSet: { usedBy: payment.userId.toString() } }
            );
          } else {
            coupon.status = CouponStatus.USED;
            coupon.usedAt = new Date();
            coupon.usedBy = [...(coupon.usedBy || []), payment.userId.toString()];
            await coupon.save();
          }
        }
      } catch (couponErr) {
        console.error("Failed to mark coupon as used in PROD MODE:", couponErr);
      }
    }
    // ---------------------------------------

    // --- NOTIFICATION LOGIC (PROD MODE) ---
    await NotificationService.notifyUser(
      payment.userId.toString(),
      "Booking Confirmed! 🎉",
      `Your booking for ${payment.spaceName} has been successfully confirmed.`,
      NotificationType.SUCCESS,
      {
        bookingId: bookingData?.booking?._id,
        paymentId: payment._id,
        type: "booking_confirmation",
      }
    );

    if (bookingData?.invoiceNumber) {
      await NotificationService.notifyUser(
        payment.userId.toString(),
        "Invoice Generated 📄",
        `Your invoice ${bookingData.invoiceNumber} for ${payment.spaceName} is now available to download.`,
        NotificationType.INFO,
        {
          invoiceNumber: bookingData.invoiceNumber,
          type: "invoice_generated",
          actionUrl: "/dashboard/documents"
        }
      );
    }
    // -------------------------------------

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        paymentId: payment._id,
        orderId: payment.razorpayOrderId,
        status: payment.status,
        spaceName: payment.spaceName,
        planName: payment.planName,
        tenure: payment.tenure,
        totalAmount: payment.totalAmount,
        bookingNumber: bookingData?.booking?.bookingNumber,
        invoiceNumber: bookingData?.invoiceNumber,
      },
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message,
    });
  }
};

/**
 * Get payment status by order ID
 * GET /api/payment/status/:orderId
 */
export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const payment = await PaymentModel.findOne({ razorpayOrderId: orderId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        paymentId: payment._id,
        orderId: payment.razorpayOrderId,
        status: payment.status,
        amount: payment.totalAmount,
        spaceName: payment.spaceName,
        planName: payment.planName,
        tenure: payment.tenure,
      },
    });
  } catch (error: any) {
    console.error("Error getting payment status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get payment status",
      error: error.message,
    });
  }
};

/**
 * Get payment details by payment ID
 * GET /api/payment/:paymentId
 */
export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    const payment = await PaymentModel.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    console.error("Error getting payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get payment details",
      error: error.message,
    });
  }
};

/**
 * Get user's payment history
 * GET /api/payment/user/:userId
 */
export const getUserPayments = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status, limit = 10, page = 1 } = req.query;

    const query: any = { userId, isDeleted: { $ne: true } };
    if (status) {
      query.status = status;
    }

    const payments = await PaymentModel.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await PaymentModel.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error("Error getting user payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user payments",
      error: error.message,
    });
  }
};

/**
 * Handle payment failure
 * POST /api/payment/failed
 */
export const handlePaymentFailure = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, error_code, error_description } = req.body;

    if (!razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const payment = await PaymentModel.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: PaymentStatus.FAILED,
        errorMessage: `${error_code}: ${error_description}`,
      },
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Payment failure recorded",
      data: {
        paymentId: payment?._id,
        status: payment?.status,
      },
    });
  } catch (error: any) {
    console.error("Error handling payment failure:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record payment failure",
      error: error.message,
    });
  }
};
