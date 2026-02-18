import { Request, Response } from "express";
import * as affiliateLeadService from "../services/affiliateLead.service";

export const create = async (req: Request, res: Response): Promise<void> => {
    try {
        const affiliateId = req.user?.id;

        if (!affiliateId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
            return;
        }

        const lead = await affiliateLeadService.createLead(affiliateId, req.body);

        res.status(201).json({
            success: true,
            message: "Lead created successfully",
            data: lead,
        });
    } catch (error: any) {
        console.error("Create Lead Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create lead",
            error: error.message,
        });
    }
};

export const getAll = async (req: Request, res: Response): Promise<void> => {
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

        const leads = await affiliateLeadService.getLeads(isAdmin ? undefined : affiliateId);

        res.status(200).json({
            success: true,
            data: leads,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Error fetching leads",
            error: error.message,
        });
    }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
    try {
        const affiliateId = req.user?.id;
        const leadId = req.params.id;

        if (!affiliateId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
            return;
        }

        const lead = await affiliateLeadService.getLeadById(leadId, affiliateId);

        if (!lead) {
            res.status(404).json({
                success: false,
                message: "Lead not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: lead,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Error fetching lead",
            error: error.message,
        });
    }
};

export const update = async (req: Request, res: Response): Promise<void> => {
    try {
        const affiliateId = req.user?.id;
        const leadId = req.params.id;

        if (!affiliateId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
            return;
        }

        const updatedLead = await affiliateLeadService.updateLead(
            leadId,
            affiliateId,
            req.body
        );

        if (!updatedLead) {
            res.status(404).json({
                success: false,
                message: "Lead not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Lead updated successfully",
            data: updatedLead,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Error updating lead",
            error: error.message,
        });
    }
};

export const deleteOne = async (req: Request, res: Response): Promise<void> => {
    try {
        const affiliateId = req.user?.id;
        const leadId = req.params.id;

        if (!affiliateId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized access",
            });
            return;
        }

        const result = await affiliateLeadService.deleteLead(leadId, affiliateId);

        if (!result) {
            res.status(404).json({
                success: false,
                message: "Lead not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Lead deleted successfully",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Error deleting lead",
            error: error.message,
        });
    }
};
