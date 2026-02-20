import {
    QuotationModel,
    Quotation,
    QuotationStatus,
} from "../models/quotation.model";
import { Types } from "mongoose";

/**
 * Create a new quotation for an affiliate
 */
export const createQuotation = async (
    affiliateId: string,
    data: Partial<Quotation>,
) => {
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: any;

    while (attempt < maxAttempts) {
        attempt += 1;
        try {
            const quotationId = await QuotationModel.generateId();
            const quotation = await QuotationModel.create({
                ...data,
                affiliateId: new Types.ObjectId(affiliateId),
                quotationId,
            });
            return quotation;
        } catch (error: any) {
            lastError = error;
            // Retry only on duplicate key collisions for quotationId.
            if (error?.code === 11000) {
                continue;
            }
            throw error;
        }
    }

    throw lastError;
};

/**
 * Get recent quotations for the dashboard list
 */
export const getRecentQuotations = async (
    affiliateId?: string,
    limit: number = 5,
) => {
    const filter = affiliateId
        ? { affiliateId: new Types.ObjectId(affiliateId) }
        : {};

    return await QuotationModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(
            "quotationId clientDetails spaceRequirements price status createdAt",
        );
};

/**
 * Get all quotations for booking management
 */
export const getAllQuotations = async (affiliateId?: string) => {
    const filter = affiliateId
        ? { affiliateId: new Types.ObjectId(affiliateId) }
        : {};

    return await QuotationModel.find(filter)
        .sort({ createdAt: -1 })
        .select(
            "quotationId clientDetails spaceRequirements price status createdAt",
        );
};

/**
 * Get statistics for the "Quotation Stats" card
 */
export const getQuotationStats = async (affiliateId?: string) => {
    const matchStage = affiliateId
        ? [{ $match: { affiliateId: new Types.ObjectId(affiliateId) } }]
        : [];

    const stats = await QuotationModel.aggregate([
        ...matchStage,
        {
            $group: {
                _id: null,
                totalSent: { $sum: 1 },
                viewed: {
                    $sum: {
                        $cond: [
                            { $eq: ["$status", QuotationStatus.VIEWED] },
                            1,
                            0,
                        ],
                    },
                },
                accepted: {
                    $sum: {
                        $cond: [
                            { $eq: ["$status", QuotationStatus.ACCEPTED] },
                            1,
                            0,
                        ],
                    },
                },
            },
        },
    ]);

    const data = stats[0] || { totalSent: 0, viewed: 0, accepted: 0 };

    // Calculate conversion rates safely
    const viewRate =
        data.totalSent > 0
            ? Math.round((data.viewed / data.totalSent) * 100)
            : 0;
    const conversionRate =
        data.totalSent > 0
            ? Math.round((data.accepted / data.totalSent) * 100)
            : 0;

    return {
        totalSent: data.totalSent,
        viewRate,
        accepted: data.accepted,
        conversion: conversionRate,
    };
};
