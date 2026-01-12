import { Router } from "express";
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
paymentRoutes.post("/create-order", createOrder);

// Verify payment (Razorpay callback)
paymentRoutes.post("/verify", verifyPayment);

// Handle payment failure
paymentRoutes.post("/failed", handlePaymentFailure);

// Get payment status by order ID
paymentRoutes.get("/status/:orderId", getPaymentStatus);

// Get payment by payment ID
paymentRoutes.get("/:paymentId", getPaymentById);

// Get user's payment history
paymentRoutes.get("/user/:userId", getUserPayments);
