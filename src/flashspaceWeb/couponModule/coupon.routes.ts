
import { Router } from "express";
import { couponController } from "./coupon.controller";
import { AuthMiddleware } from "../authModule/middleware/auth.middleware";
import { UserRole } from "../authModule/models/user.model";

export const couponRoutes = Router();

// Admin Routes (Protect with Auth & Role)
couponRoutes.post(
    "/create",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.ADMIN, UserRole.SALES),
    (req, res) => couponController.createCoupon(req, res)
);

couponRoutes.get(
    "/admin/all",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.ADMIN, UserRole.SALES),
    (req, res) => couponController.getAllCoupons(req, res)
);

couponRoutes.delete(
    "/:id",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.ADMIN),
    (req, res) => couponController.deleteCoupon(req, res)
);

// Public / User Routes
// Validate coupon before purchase
couponRoutes.post(
    "/validate",
    AuthMiddleware.authenticate,
    (req, res) => couponController.validateCoupon(req, res)
);

// Mark coupon as used (Called after successful payment)
couponRoutes.post(
    "/use",
    AuthMiddleware.authenticate,
    (req, res) => couponController.markUsed(req, res)
);

// Affiliate Specific Routes
couponRoutes.post(
    "/affiliate/generate",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE),
    (req, res) => couponController.generateAffiliateCoupon(req, res)
);

couponRoutes.get(
    "/affiliate/my-coupon",
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole(UserRole.AFFILIATE),
    (req, res) => couponController.getAffiliateCoupon(req, res)
);
