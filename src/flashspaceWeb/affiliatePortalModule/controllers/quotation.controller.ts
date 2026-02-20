import { Request, Response } from "express";
import * as quotationService from "../services/quotation.service";



export const create = async (
    req: Request, // Use standard Request here to avoid initial type error
    res: Response,
): Promise<void> => {
    try {
        // Cast req to AuthRequest inside the function
        const affiliateId = req.user?.id;

        if (!affiliateId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
            return;
        }

        const quotation = await quotationService.createQuotation(
            affiliateId,
            req.body,
        );

        res.status(201).json({
            success: true,
            message: "Quotation generated successfully",
            data: quotation,
        });
    } catch (error: any) {
        console.error("Create Quotation Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate quotation",
            error: error.message,
        });
    }
};

export const getRecent = async (
    req: Request,
    res: Response,
): Promise<void> => {
    try {
        const affiliateId = req.user?.id;
        const isAdmin = req.user?.role === "admin";
        
        if (!affiliateId && !isAdmin) {
            res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
            return;
        }

        const quotations =
            await quotationService.getRecentQuotations(
                isAdmin ? undefined : affiliateId,
            );

        res.status(200).json({
            success: true,
            data: quotations,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Error fetching quotations",
            error: error.message,
        });
    }
};

export const getAll = async (
    req: Request,
    res: Response,
): Promise<void> => {
    try {
        const affiliateId = req.user?.id;
        const isAdmin = req.user?.role === "admin";

        if (!affiliateId && !isAdmin) {
            res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
            return;
        }

        const quotations = await quotationService.getAllQuotations(
            isAdmin ? undefined : affiliateId,
        );

        res.status(200).json({
            success: true,
            data: quotations,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Error fetching quotations",
            error: error.message,
        });
    }
};

export const getStats = async (
    req: Request,
    res: Response,
): Promise<void> => {
    try {
        const affiliateId = req.user?.id;
        const isAdmin = req.user?.role === "admin";
        
        if (!affiliateId && !isAdmin) {
            res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
            return;
        }

        const stats = await quotationService.getQuotationStats(
            isAdmin ? undefined : affiliateId,
        );

        res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Error fetching stats",
            error: error.message,
        });
    }
};
