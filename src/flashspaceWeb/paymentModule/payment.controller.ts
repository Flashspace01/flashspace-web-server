import { Request, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { PaymentModel, PaymentStatus, PaymentType } from "./payment.model";
import { BookingModel } from "../userDashboardModule/models/booking.model";
import { InvoiceModel } from "../userDashboardModule/models/invoice.model";
import { KYCDocumentModel } from "../userDashboardModule/models/kyc.model";
import { VirtualOfficeModel } from "../virtualOfficeModule/virtualOffice.model";
import { CoworkingSpaceModel } from "../coworkingSpaceModule/coworkingSpace.model";
import { UserModel } from "../authModule/models/user.model";
import { CreditLedgerModel, CreditSource } from "../userDashboardModule/models/creditLedger.model";

// Initialize Razorpay with API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// Helper function to create booking and invoice after payment
async function createBookingAndInvoice(payment: any) {
  try {
    // Generate booking number
    const bookingCount = await BookingModel.countDocuments();
    const bookingNumber = `FS-${new Date().getFullYear()}-${String(bookingCount + 1).padStart(5, "0")}`;

    // Get space details for snapshot
    let spaceSnapshot: any = {
      _id: payment.spaceId,
      name: payment.spaceName,
    };

    if (payment.paymentType === PaymentType.VIRTUAL_OFFICE) {
      const space = await VirtualOfficeModel.findById(payment.spaceId);
      if (space) {
        spaceSnapshot = {
          _id: space._id?.toString(),
          name: space.name,
          address: space.address,
          city: space.city,
          area: space.area,
          image: space.image,
          coordinates: space.coordinates,
        };
      }
    } else if (payment.paymentType === PaymentType.COWORKING_SPACE) {
      const space = await CoworkingSpaceModel.findById(payment.spaceId);
      if (space) {
        spaceSnapshot = {
          _id: space._id?.toString(),
          name: space.name,
          address: space.address,
          city: space.city,
          area: space.area,
          image: space.image,
          coordinates: space.coordinates,
        };
      }
    }
    // For MEETING_ROOM, we rely on the initial spaceSnapshot (name and ID from payment)
    // or we could add specific MeetingRoomModel lookup later.

    // Calculate dates
    const startDate = payment.startDate ? new Date(payment.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (payment.tenure * 12)); // tenure in years

    // Create booking
    const booking = await BookingModel.create({
      bookingNumber,
      user: payment.userId,
      type: payment.paymentType === PaymentType.VIRTUAL_OFFICE ? "virtual_office" : payment.paymentType === PaymentType.MEETING_ROOM ? "meeting_room" : "coworking_space",
      spaceId: payment.spaceId,
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
      features: ["Business Address", "Mail Handling", "GST Registration Support"],
    });

    // Generate invoice number
    const invoiceCount = await InvoiceModel.countDocuments();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, "0")}`;

    // Calculate tax (18% GST)
    const subtotal = payment.totalAmount;
    const taxRate = 18;
    const taxAmount = Math.round((subtotal * taxRate) / 118); // Extract GST from inclusive price
    const baseAmount = subtotal - taxAmount;

    // Create invoice
    await InvoiceModel.create({
      invoiceNumber,
      user: payment.userId,
      bookingId: booking._id?.toString(),
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

    // Create/update KYC record
    let kyc = await KYCDocumentModel.findOne({ user: payment.userId });
    if (!kyc) {
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

    // Credits & Rewards Logic (Only for Meeting Rooms)
    if (payment.paymentType === PaymentType.MEETING_ROOM) {
      const creditPercentage = 0.5; // 50%
      const creditsEarned = Math.floor(payment.totalAmount * creditPercentage); // totalAmount is in INR (not paise here, wait. Payment model says totalAmount is in paise? No. Payment model says amount is in paise, totalAmount is number. let's check creating order.
      // In createOrder: amount: totalAmount * 100. payment.totalAmount is raw amount.
      // So if 1200 INR, totalAmount is 1200.

      if (creditsEarned > 0) {
        // Update User
        await UserModel.findByIdAndUpdate(payment.userId, {
          $inc: { credits: creditsEarned }
        });

        // Get updated user to get new balance
        const user = await UserModel.findById(payment.userId);

        // Create Ledger Entry
        await CreditLedgerModel.create({
          user: payment.userId,
          amount: creditsEarned,
          source: CreditSource.BOOKING,
          description: `Earned ${creditsEarned} credits for meeting room booking #${bookingNumber}`,
          referenceId: booking._id?.toString(),
          balanceAfter: user?.credits || 0
        });
      }
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
    } = req.body;

    // Validation
    if (!userId || !userEmail || !spaceId || !planName || !tenure || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        error: "userId, userEmail, spaceId, planName, tenure, and totalAmount are required",
      });
    }

    // Check Razorpay Keys
    let razorpayOrder;

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn("Razorpay keys missing - Switching to DEV MODE (Mock Order)");
      razorpayOrder = {
        id: `order_mock_${Date.now()}`,
        amount: Math.round(totalAmount * 100),
        currency: "INR"
      };
    } else {
      // Create Razorpay order (receipt max 40 chars)
      const receiptId = `ord_${Date.now().toString(36)}`;
      try {
        razorpayOrder = await razorpay.orders.create({
          amount: Math.round(totalAmount * 100), // Convert to paise and ensure integer
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
        { new: true }
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
      } catch (err) {
        console.error("Failed to create booking:", err);
      }

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
          errorMessage: "Signature verification failed"
        }
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
      { new: true }
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
    } catch (err) {
      console.error("Failed to create booking:", err);
    }

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
      { new: true }
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
