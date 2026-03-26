import { Router } from "express";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  getPaymentById,
  getUserPayments,
  handlePaymentFailure,
} from "./payment.controller";

export const paymentRoutes = Router();

// Create a new order
paymentRoutes.post(
  "/create-order",
  AuthMiddleware.authenticate,
  AuthMiddleware.rateLimit(10, 60 * 60 * 1000), // 10 attempts per hour
  createOrder,
);

// Verify payment (Razorpay callback)
paymentRoutes.post(
  "/verify",
  AuthMiddleware.rateLimit(20, 60 * 60 * 1000), // 20 attempts per hour
  verifyPayment
);

// Handle payment failure
paymentRoutes.post("/failed", handlePaymentFailure);

// Get payment status by order ID
paymentRoutes.get("/status/:orderId", getPaymentStatus);

// Get payment by payment ID
paymentRoutes.get("/:paymentId", getPaymentById);

// Get user's payment history
paymentRoutes.get("/user/:userId", getUserPayments);
