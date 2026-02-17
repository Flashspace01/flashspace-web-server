import { Request, Response } from "express";
import { SpacePortalEnquiriesService } from "../services/enquiries.service";
import { EnquiryStatus } from "../models/enquiry.model";

const enquiriesService = new SpacePortalEnquiriesService();

export const createEnquiry = async (req: Request, res: Response) => {
  const result = await enquiriesService.createEnquiry(req.body);
  res.status(result.success ? 201 : 400).json(result);
};

export const getEnquiries = async (req: Request, res: Response) => {
  const { search, status, page, limit, includeDeleted } = req.query;

  const result = await enquiriesService.getEnquiries({
    search: search as string | undefined,
    status: status as EnquiryStatus | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    includeDeleted: includeDeleted === "true",
  });

  res.status(result.success ? 200 : 400).json(result);
};

export const getEnquiryById = async (req: Request, res: Response) => {
  const { enquiryId } = req.params;
  const result = await enquiriesService.getEnquiryById(enquiryId);
  res.status(result.success ? 200 : 404).json(result);
};

export const updateEnquiry = async (req: Request, res: Response) => {
  const { enquiryId } = req.params;
  const result = await enquiriesService.updateEnquiry(enquiryId, req.body);
  res.status(result.success ? 200 : 400).json(result);
};

export const updateEnquiryStatus = async (req: Request, res: Response) => {
  const { enquiryId } = req.params;
  const { status } = req.body as { status: EnquiryStatus };
  const result = await enquiriesService.updateEnquiryStatus(enquiryId, status);
  res.status(result.success ? 200 : 400).json(result);
};

export const deleteEnquiry = async (req: Request, res: Response) => {
  const { enquiryId } = req.params;
  const restore = req.query.restore === "true";
  const result = await enquiriesService.deleteEnquiry(enquiryId, restore);
  res.status(result.success ? 200 : 400).json(result);
};
