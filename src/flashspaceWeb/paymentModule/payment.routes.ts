import { Router } from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  getPaymentById,
  getUserPayments,
  handlePaymentFailure,
} from "./payment.controller";
import { paymentRateLimiter, readRateLimiter } from "../../config/rateLimiter.config";

export const paymentRoutes = Router();

// Create a new order
paymentRoutes.post("/create-order", paymentRateLimiter, createOrder);

// Verify payment (Razorpay callback)
paymentRoutes.post("/verify", paymentRateLimiter, verifyPayment);

// Handle payment failure
paymentRoutes.post("/failed", paymentRateLimiter, handlePaymentFailure);

// Get payment status by order ID
paymentRoutes.get("/status/:orderId", readRateLimiter, getPaymentStatus);

// Get payment by payment ID
paymentRoutes.get("/:paymentId", readRateLimiter, getPaymentById);

// Get user's payment history
paymentRoutes.get("/user/:userId", readRateLimiter, getUserPayments);
