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
import { UserModel, UserRole } from "../authModule/models/user.model";
import {
  CreditLedgerModel,
  CreditType,
} from "../creditLedgerModule/creditLedger.model";
import {
  NotificationModel,
  NotificationType,
  NotificationRecipientType,
} from "../notificationModule/models/Notification";
import { NotificationService } from "../notificationModule/services/notification.service";
import { CouponModel, CouponStatus } from "../couponModule/coupon.model";
import { getIO } from "../../socket";
import { BookingService as SeatingService } from "../seatingModule/seating.service";
import { SeatBookingModel } from "../seatingModule/seating.model";
import {
  createOrderSchema,
  verifyPaymentSchema,
  getPaymentStatusSchema,
  getPaymentByIdSchema,
  getUserPaymentsSchema,
  handlePaymentFailureSchema,
} from "./payment.validation";

// Initialize Razorpay with API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// Helper function to create booking and invoice after payment
async function createBookingAndInvoice(payment: any) {
  try {
    const spaceId = payment.space; // Standardized: Payment model uses 'space'
    const paymentType = payment.paymentType;
    const userId = payment.user;

    // 1. If it's a seat booking, confirm the hold first
    if (paymentType === PaymentType.SEAT_BOOKING && payment.seatBooking) {
      try {
        await SeatingService.confirmBooking(
          payment.seatBooking.toString(),
          userId.toString(),
          payment.razorpayPaymentId,
        );
      } catch (confirmError) {
        console.error("Error confirming seat booking hold:", confirmError);
      }
    }

    // 2. Fetch space data and resolve partner reliably
    let spaceData: any = null;
    let spaceModelName = "";

    if (paymentType === PaymentType.VIRTUAL_OFFICE) {
      spaceData =
        await VirtualOfficeModel.findById(spaceId).populate("property");
      spaceModelName = "VirtualOffice";
    } else if (
      paymentType === PaymentType.COWORKING_SPACE ||
      paymentType === PaymentType.SEAT_BOOKING
    ) {
      spaceData =
        await CoworkingSpaceModel.findById(spaceId).populate("property");
      spaceModelName = "CoworkingSpace";
    } else if (paymentType === PaymentType.MEETING_ROOM) {
      spaceData = await MeetingRoomModel.findById(spaceId).populate("property");
      spaceModelName = "MeetingRoom";
    }

    if (!spaceData) {
      console.warn(
        `Space ${spaceId} not found during booking creation for payment ${payment._id}`,
      );
    }

    // Resolve Partner ID (Robust fallback to space partner, then admin as last resort)
    let partnerId = spaceData?.partner;
    if (!partnerId) {
      console.warn(
        `No partner found for space ${spaceId}. Searching for admin...`,
      );
      const admin = await UserModel.findOne({
        role: UserRole.ADMIN,
        isDeleted: { $ne: true },
      });
      partnerId = admin?._id || userId; // Last fallback to user
    }

    // 3. Create Space Snapshot
    const property = spaceData?.property as any;
    const spaceSnapshot: any = {
      _id: spaceId.toString(),
      name: property?.name || spaceData?.name || payment.spaceName,
      address: property?.address || "",
      city: property?.city || "",
      area: property?.area || "",
      image: property?.images?.[0] || "",
      coordinates: property?.location?.coordinates || { lat: 0, lng: 0 },
    };

    // 4. Create Booking entry in BookingModel (Unified for all types)
    const bookingCount = await BookingModel.countDocuments();
    const bookingNumber = `FS-${new Date().getFullYear()}-${String(bookingCount + 1).padStart(5, "0")}`;

    const startDate = payment.startDate
      ? new Date(payment.startDate)
      : new Date();
    let endDate = new Date(startDate);

    if (paymentType === PaymentType.SEAT_BOOKING && payment.seatBooking) {
      const seatHold = await SeatBookingModel.findById(payment.seatBooking);
      if (seatHold) endDate = new Date(seatHold.endTime);
      else endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + payment.tenure * 12);
    }

    const booking = await BookingModel.create({
      bookingNumber,
      user: userId,
      partner: partnerId,
      type: spaceModelName,
      spaceId: spaceId,
      spaceSnapshot,
      plan: {
        name: payment.planName,
        price: payment.totalAmount,
        originalPrice: payment.yearlyPrice * (payment.tenure || 1),
        discount: payment.discountAmount || 0,
        tenure:
          paymentType === PaymentType.SEAT_BOOKING ? 1 : payment.tenure * 12,
        tenureUnit:
          paymentType === PaymentType.SEAT_BOOKING ? "days" : "months",
      },
      payment: payment._id,
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
      startDate,
      endDate,
      features:
        paymentType === PaymentType.VIRTUAL_OFFICE
          ? ["Business Address", "Mail Handling", "GST Support"]
          : ["High Speed WiFi", "Unlimited Coffee", "Office Supplies"],
    });

    // 5. Create Invoice
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

    const subtotal = payment.totalAmount;
    const taxRate = 18;
    const taxAmount = Math.round((subtotal * taxRate) / 118);
    const baseAmount = subtotal - taxAmount;

    await InvoiceModel.create({
      invoiceNumber,
      user: userId,
      partner: partnerId,
      booking: booking._id,
      bookingNumber,
      payment: payment._id,
      description: `${payment.spaceName} - ${payment.planName}`,
      lineItems: [
        {
          description: `${payment.planName}`,
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

    // 6. KYC & Credits
    let kyc = await KYCDocumentModel.findOne({ user: userId });
    if (!kyc) {
      kyc = await KYCDocumentModel.create({
        user: userId,
        booking: booking._id,
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

    // Credits (1% Earnings)
    const creditsEarned = Math.floor(payment.totalAmount * 0.01);
    if (creditsEarned > 0) {
      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $inc: { credits: creditsEarned } },
        { new: true },
      );
      await CreditLedgerModel.create({
        user: userId,
        amount: creditsEarned,
        type: CreditType.EARNED,
        description: `Earned 1% credits for booking #${bookingNumber}`,
        referenceId: booking._id.toString(),
        booking: booking._id,
        balanceAfter: updatedUser?.credits || 0,
      });
    }

    // Credits Deduction
    if (payment.creditsUsed && payment.creditsUsed > 0) {
      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $inc: { credits: -payment.creditsUsed } },
        { new: true },
      );
      await CreditLedgerModel.create({
        user: userId,
        amount: -payment.creditsUsed,
        type: CreditType.SPENT,
        description: `Used credits for booking #${bookingNumber}`,
        referenceId: booking._id.toString(),
        booking: booking._id,
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
    const validation = createOrderSchema.safeParse(req);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: validation.error,
      });
    }

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
      paymentType,
      startDate,
      couponCode,
      affiliateId,
      holdId,
      creditsToUse,
    } = validation.data.body as any; // Type override since we know these fields are present in the request schema

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

    // Verify Space isActive Status before proceeding
    let spaceData: any = null;
    if (paymentType === PaymentType.VIRTUAL_OFFICE) {
      spaceData =
        await VirtualOfficeModel.findById(spaceId).populate("property");
    } else if (
      paymentType === PaymentType.COWORKING_SPACE ||
      paymentType === PaymentType.SEAT_BOOKING
    ) {
      spaceData =
        await CoworkingSpaceModel.findById(spaceId).populate("property");
    } else if (paymentType === PaymentType.MEETING_ROOM) {
      spaceData = await MeetingRoomModel.findById(spaceId).populate("property");
    }

    if (!spaceData || spaceData.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Space not found",
      });
    }

    if (!spaceData.isActive) {
      return res.status(400).json({
        success: false,
        message: "This space is currently inactive and cannot be booked.",
      });
    }

    // Also check if parent property is active
    if (spaceData.property && !spaceData.property.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "This property is currently inactive and its spaces cannot be booked.",
      });
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
      user: userId,
      userEmail,
      userName: userName || "Guest",
      userPhone,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount, // matches created amount
      currency: "INR",
      status: PaymentStatus.PENDING,
      paymentType,
      spaceModel:
        paymentType === PaymentType.VIRTUAL_OFFICE
          ? "VirtualOffice"
          : paymentType === PaymentType.MEETING_ROOM
            ? "MeetingRoom"
            : "CoworkingSpace",
      space: spaceId,
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
      seatBooking: holdId,
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
    const validation = verifyPaymentSchema.safeParse(req);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: validation.error,
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      devMode,
    } = validation.data.body;

    // DEV MODE: Skip signature verification for development
    if (devMode === true) {
      const devPayment = await PaymentModel.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id || `pay_dev_${Date.now()}`,
          razorpaySignature: razorpay_signature || "dev_signature",
          status: PaymentStatus.COMPLETED,
        },
        { new: true },
      );

      if (!devPayment) {
        return res.status(404).json({
          success: false,
          message: "Payment order not found",
        });
      }

      // Create booking and invoice
      let devBookingData: any = null;
      try {
        devBookingData = await createBookingAndInvoice(devPayment);

        // --- NOTIFICATION LOGIC (DEV MODE) ---
        const notification = await NotificationModel.create({
          recipient: devPayment.user,
          recipientType: NotificationRecipientType.USER,
          type: NotificationType.SUCCESS,
          title: "Booking Confirmed! 🎉",
          message: `Your booking for ${devPayment.spaceName} has been successfully confirmed.`,
          read: false,
          metadata: {
            bookingId: devBookingData?.booking?._id,
            paymentId: devPayment._id,
            type: "booking_confirmation",
          },
        });

        if (devBookingData?.invoiceNumber) {
          await NotificationService.notifyUser(
            devPayment.user.toString(),
            "Invoice Generated 📄",
            `Your invoice ${devBookingData.invoiceNumber} for ${devPayment.spaceName} is now available to download.`,
            NotificationType.INFO,
            {
              invoiceNumber: devBookingData.invoiceNumber,
              type: "invoice_generated",
              actionUrl: "/dashboard/documents",
            },
          );
        }
        // Emit Socket Event
        try {
          const io = getIO();
          io.to(devPayment.user.toString()).emit(
            "notification:new",
            notification,
          );
        } catch (socketError) {
          console.error("Socket emission failed:", socketError);
        }
        // -------------------------------------
      } catch (err: any) {
        console.error("Failed to create booking:", err);
      }

      // --- MARK COUPON AS USED (DEV MODE) ---
      if (devPayment.couponCode) {
        try {
          const coupon = await CouponModel.findOne({
            code: devPayment.couponCode,
            isDeleted: { $ne: true },
          });
          if (coupon) {
            if (coupon.isAffiliateCoupon) {
              await CouponModel.updateOne(
                { _id: coupon._id },
                { $addToSet: { usedBy: devPayment.user.toString() } },
              );
            } else {
              coupon.status = CouponStatus.USED;
              coupon.usedAt = new Date();
              coupon.usedBy = [
                ...(coupon.usedBy || []),
                devPayment.user.toString(),
              ];
              await coupon.save();
            }
          }
        } catch (couponErr) {
          console.error(
            "Failed to mark coupon as used in DEV MODE:",
            couponErr,
          );
        }
      }
      // -------------------------------------

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully (DEV MODE)",
        data: {
          paymentId: devPayment._id,
          orderId: devPayment.razorpayOrderId,
          status: devPayment.status,
          spaceName: devPayment.spaceName,
          planName: devPayment.planName,
          tenure: devPayment.tenure,
          totalAmount: devPayment.totalAmount,
          bookingNumber: devBookingData?.booking?.bookingNumber,
          invoiceNumber: devBookingData?.invoiceNumber,
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
    const prodPayment = await PaymentModel.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: PaymentStatus.COMPLETED,
      },
      { new: true },
    );

    if (!prodPayment) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found",
      });
    }

    // Create booking and invoice
    let prodBookingData: any = null;
    try {
      prodBookingData = await createBookingAndInvoice(prodPayment);

      // --- NOTIFICATION LOGIC (PROD MODE) ---
      const notification = await NotificationModel.create({
        recipient: prodPayment.user,
        recipientType: NotificationRecipientType.USER,
        type: NotificationType.SUCCESS,
        title: "Booking Confirmed! 🎉",
        message: `Your booking for ${prodPayment.spaceName} has been successfully confirmed.`,
        read: false,
        metadata: {
          bookingId: prodBookingData?.booking?._id || prodPayment._id,
          paymentId: prodPayment._id,
          type: "booking_confirmation",
        },
      });

      // Emit Socket Event
      try {
        const io = getIO();
        io.to(prodPayment.user.toString()).emit(
          "notification:new",
          notification,
        );
      } catch (socketError) {
        console.error("Socket emission failed:", socketError);
      }
      // -------------------------------------
    } catch (err: any) {
      console.error("Failed to create booking:", err);
    }

    // --- MARK COUPON AS USED (PROD MODE) ---
    if (prodPayment.couponCode) {
      try {
        const coupon = await CouponModel.findOne({
          code: prodPayment.couponCode,
          isDeleted: { $ne: true },
        });
        if (coupon) {
          if (coupon.isAffiliateCoupon) {
            await CouponModel.updateOne(
              { _id: coupon._id },
              { $addToSet: { usedBy: prodPayment.user.toString() } },
            );
          } else {
            coupon.status = CouponStatus.USED;
            coupon.usedAt = new Date();
            coupon.usedBy = [
              ...(coupon.usedBy || []),
              prodPayment.user.toString(),
            ];
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
      prodPayment.user.toString(),
      "Booking Confirmed! 🎉",
      `Your booking for ${prodPayment.spaceName} has been successfully confirmed.`,
      NotificationType.SUCCESS,
      {
        bookingId: prodBookingData?.booking?._id,
        paymentId: prodPayment._id,
        type: "booking_confirmation",
      },
    );

    if (prodBookingData?.invoiceNumber) {
      await NotificationService.notifyUser(
        prodPayment.user.toString(),
        "Invoice Generated 📄",
        `Your invoice ${prodBookingData.invoiceNumber} for ${prodPayment.spaceName} is now available to download.`,
        NotificationType.INFO,
        {
          invoiceNumber: prodBookingData.invoiceNumber,
          type: "invoice_generated",
          actionUrl: "/dashboard/documents",
        },
      );
    }
    // -------------------------------------

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        paymentId: prodPayment._id,
        orderId: prodPayment.razorpayOrderId,
        status: prodPayment.status,
        spaceName: prodPayment.spaceName,
        planName: prodPayment.planName,
        tenure: prodPayment.tenure,
        totalAmount: prodPayment.totalAmount,
        bookingNumber: prodBookingData?.booking?.bookingNumber,
        invoiceNumber: prodBookingData?.invoiceNumber,
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
    const validation = getPaymentStatusSchema.safeParse(req);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: validation.error,
      });
    }

    const { orderId } = validation.data.params;

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
    const validation = getPaymentByIdSchema.safeParse(req);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: validation.error,
      });
    }

    const { paymentId } = validation.data.params;

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
    const validation = getUserPaymentsSchema.safeParse(req);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: validation.error,
      });
    }

    const { userId } = validation.data.params;
    const { status, limit, page } = validation.data.query;
    const _limit = limit ? Math.min(limit, 100) : 10;
    const _page = page ? Math.max(page, 1) : 1;

    const query: any = { user: userId, isDeleted: { $ne: true } };
    if (status) {
      query.status = status;
    }

    const payments = await PaymentModel.find(query)
      .sort({ createdAt: -1 })
      .limit(_limit)
      .skip((_page - 1) * _limit);

    const total = await PaymentModel.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          page: _page,
          limit: _limit,
          totalPages: Math.ceil(total / _limit),
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
    const validation = handlePaymentFailureSchema.safeParse(req);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: validation.error,
      });
    }

    const { razorpay_order_id, error_code, error_description } =
      validation.data.body;

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
