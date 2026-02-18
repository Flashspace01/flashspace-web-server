import {
    AffiliateLead,
    AffiliateLeadModel,
    LeadStatus,
} from "../models/affiliateLead.model";
import { Types } from "mongoose";

/**
 * Create a new lead
 */
export const createLead = async (
    affiliateId: string,
    data: Partial<AffiliateLead>,
): Promise<AffiliateLead> => {
    return await AffiliateLeadModel.create({
        ...data,
        affiliateId: new Types.ObjectId(affiliateId),
    });
};

/**
 * Get all leads for an affiliate
 */
export const getLeads = async (
    affiliateId?: string,
): Promise<AffiliateLead[]> => {
    const filter = affiliateId
        ? { affiliateId: new Types.ObjectId(affiliateId) }
        : {};
    return await AffiliateLeadModel.find(filter).sort({ createdAt: -1 });
};

/**
 * Get a single lead by ID
 */
export const getLeadById = async (
    leadId: string,
    affiliateId: string,
): Promise<AffiliateLead | null> => {
    return await AffiliateLeadModel.findOne({
        _id: new Types.ObjectId(leadId),
        affiliateId: new Types.ObjectId(affiliateId),
    });
};

/**
 * Update a lead
 */
export const updateLead = async (
    leadId: string,
    affiliateId: string,
    updates: Partial<AffiliateLead>,
): Promise<AffiliateLead | null> => {
    return await AffiliateLeadModel.findOneAndUpdate(
        { _id: new Types.ObjectId(leadId), affiliateId: new Types.ObjectId(affiliateId) },
        { ...updates, lastContact: new Date() }, // Update last contact on modification
        { new: true },
    );
};

/**
 * Delete a lead
 */
export const deleteLead = async (
    leadId: string,
    affiliateId: string,
): Promise<boolean> => {
    const result = await AffiliateLeadModel.deleteOne({
        _id: new Types.ObjectId(leadId),
        affiliateId: new Types.ObjectId(affiliateId),
    });
    return result.deletedCount === 1;
};
