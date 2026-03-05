import { z } from "zod";
import mongoose from "mongoose";
import { PaymentType, PaymentStatus } from "./payment.model";

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId",
  });

export const createOrderSchema = z.object({
  body: z.object({
    userId: objectIdSchema,
    userEmail: z.string().email(),
    userName: z.string().min(1, "Name is required"),
    userPhone: z.string().optional(),
    spaceId: objectIdSchema,
    spaceName: z.string().min(1, "Space Name is required"),
    planName: z.string().min(1, "Plan Name is required"),
    planKey: z.string().min(1, "Plan Key is required"),
    tenure: z.number().int().min(0, "Tenure must be at least 0"),
    yearlyPrice: z.number().nonnegative(),
    totalAmount: z.number().positive(),
    discountPercent: z.number().min(0).max(100).optional(),
    discountAmount: z.number().nonnegative().optional(),
    paymentType: z.nativeEnum(PaymentType).default(PaymentType.VIRTUAL_OFFICE),
    startDate: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .optional(),
    holdId: objectIdSchema.optional(),
    creditsToUse: z.number().int().nonnegative().optional().default(0),
    couponCode: z.string().optional(), // Coupon code applied at checkout
    affiliateId: z.string().optional(), // Affiliate user ID if coupon is affiliate-type
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1, "Order ID required"),
    razorpay_payment_id: z.string().optional(), // Can be missing if DEV
    razorpay_signature: z.string().optional(), // Can be missing if DEV
    devMode: z.boolean().optional(),
  }),
});

export const getPaymentStatusSchema = z.object({
  params: z.object({
    orderId: z.string().min(1, "Order ID is required"),
  }),
});

export const getPaymentByIdSchema = z.object({
  params: z.object({
    paymentId: objectIdSchema,
  }),
});

export const getUserPaymentsSchema = z.object({
  params: z.object({
    userId: objectIdSchema,
  }),
  query: z.object({
    status: z.nativeEnum(PaymentStatus).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((val) => !val || val <= 100, {
        message: "Limit cannot exceed 100",
      })
      .optional(),
  }),
});

export const handlePaymentFailureSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1, "Order ID is required"),
    error_code: z.string().optional(),
    error_description: z.string().optional(),
  }),
});
