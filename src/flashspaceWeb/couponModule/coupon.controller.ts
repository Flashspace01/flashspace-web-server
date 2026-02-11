
import { Request, Response } from "express";
import { CouponModel, CouponStatus } from "./coupon.model";
import crypto from "crypto";

/**
 * Generate a unique coupon code
 */
const generateCouponCode = (): string => {
    return "CPN-" + crypto.randomBytes(3).toString("hex").toUpperCase();
};

export const couponController = {
    /**
     * Create a new coupon for a specific client
     */
    createCoupon: async (req: Request, res: Response) => {
        try {
            const { assignedClientId, discountValue, expiryDate, manualCode } = req.body;
            const createdBy = req.user?.id;

            if (!assignedClientId || !discountValue || !expiryDate) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required fields: assignedClientId, discountValue, expiryDate",
                });
            }

            let code;
            if (manualCode) {
                code = manualCode.toUpperCase().trim();
                // Check if code already exists
                const existing = await CouponModel.findOne({ code });
                if (existing) {
                    return res.status(409).json({
                        success: false,
                        message: "Coupon code already exists. Please use a different one."
                    });
                }
            } else {
                code = generateCouponCode();
            }

            const coupon = await CouponModel.create({
                code,
                discountType: "percentage",
                discountValue,
                assignedClientId,
                expiryDate: new Date(expiryDate),
                createdBy,
                status: CouponStatus.ACTIVE,
            });

            return res.status(201).json({
                success: true,
                message: "Coupon created successfully",
                data: coupon,
            });
        } catch (error: any) {
            console.error("Error creating coupon:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to create coupon",
                error: error.message,
            });
        }
    },

    /**
     * Get all coupons (Admin)
     * can filter by client or status via query params
     */
    getAllCoupons: async (req: Request, res: Response) => {
        try {
            const { clientId, status } = req.query;
            const query: any = { isDeleted: { $ne: true } };

            if (clientId) query.assignedClientId = clientId;
            if (status) query.status = status;

            const coupons = await CouponModel.find(query).sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                data: coupons,
            });
        } catch (error: any) {
            console.error("Error fetching coupons:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch coupons",
                error: error.message,
            });
        }
    },

    /**
     * Delete / Disable a coupon
     */
    deleteCoupon: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const coupon = await CouponModel.findByIdAndUpdate(
                id,
                { isDeleted: true, status: CouponStatus.DISABLED },
                { new: true }
            );

            if (!coupon) {
                return res.status(404).json({
                    success: false,
                    message: "Coupon not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Coupon deleted successfully",
            });
        } catch (error: any) {
            console.error("Error deleting coupon:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to delete coupon",
                error: error.message,
            });
        }
    },

    /**
     * Validate a coupon for a user
     */
    validateCoupon: async (req: Request, res: Response) => {
        try {
            const { code } = req.body;
            const userId = req.user?.id;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: "Coupon code is required",
                });
            }

            const coupon = await CouponModel.findOne({
                code,
                isDeleted: { $ne: true },
            });

            if (!coupon) {
                return res.status(404).json({
                    success: false,
                    valid: false,
                    message: "Invalid coupon code",
                });
            }

            // 1. Check if coupon is for this user
            if (coupon.assignedClientId.toString() !== userId?.toString()) {
                return res.status(403).json({
                    success: false,
                    valid: false,
                    message: "This coupon is not applicable to your account",
                });
            }

            // 2. Check status
            if (coupon.status !== CouponStatus.ACTIVE) {
                return res.status(400).json({
                    success: false,
                    valid: false,
                    message: `Coupon is ${coupon.status}`,
                });
            }

            // 3. Check expiry
            if (new Date() > new Date(coupon.expiryDate)) {
                // Auto-expire if date passed
                coupon.status = CouponStatus.EXPIRED;
                await coupon.save();
                return res.status(400).json({
                    success: false,
                    valid: false,
                    message: "Coupon has expired",
                });
            }

            // Valid
            return res.status(200).json({
                success: true,
                valid: true,
                message: "Coupon applied successfully",
                data: {
                    code: coupon.code,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                }
            });

        } catch (error: any) {
            console.error("Error validating coupon:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to validate coupon",
                error: error.message,
            });
        }
    },

    /**
     * Mark coupon as used (To be called after successful payment)
     */
    markUsed: async (req: Request, res: Response) => {
        try {
            const { code } = req.body;
            // Ideally verify that the request comes from trusted internal source or is part of a transaction
            // For now, we assume it's protected by auth and called by frontend after payment success, 
            // BUT stricter implementation would call this inside the payment success webhook/logic.
            // Since we must not touch existing payment logic, we expose this endpoint.

            const coupon = await CouponModel.findOne({ code });

            if (!coupon) {
                return res.status(404).json({ success: false, message: "Coupon not found" });
            }

            if (coupon.status !== CouponStatus.ACTIVE) {
                return res.status(400).json({ success: false, message: "Coupon is not active" });
            }

            coupon.status = CouponStatus.USED;
            coupon.usedAt = new Date();
            await coupon.save();

            return res.status(200).json({
                success: true,
                message: "Coupon marked as used"
            });

        } catch (error: any) {
            console.error("Error marking coupon used:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to mark coupon as used",
                error: error.message,
            });
        }
    }
};
