import { Types } from "mongoose";
import { ApiResponse } from "../../authModule/types/auth.types";
import {
  SpacePortalEnquiryModel,
  EnquiryStatus,
} from "../models/enquiry.model";

export type CreateEnquiryInput = {
  clientName: string;
  companyName: string;
  phone: string;
  email: string;
  requestedPlan: string;
  requestedSpace: string;
  status?: EnquiryStatus;
};

export type ListEnquiriesParams = {
  search?: string;
  status?: EnquiryStatus;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class SpacePortalEnquiriesService {
  async createEnquiry(payload: CreateEnquiryInput): Promise<ApiResponse> {
    try {
      const created = await SpacePortalEnquiryModel.create({
        ...payload,
        status: payload.status || EnquiryStatus.NEW,
      });

      return {
        success: true,
        message: "Enquiry created successfully",
        data: created,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to create enquiry",
        error: error?.message,
      };
    }
  }

  async getEnquiries(params: ListEnquiriesParams): Promise<ApiResponse> {
    try {
      const {
        search,
        status,
        page = 1,
        limit = 10,
        includeDeleted = false,
      } = params;

      const query: any = {
        isDeleted: includeDeleted ? { $in: [true, false] } : false,
      };

      if (status) query.status = status;

      if (search) {
        const term = new RegExp(escapeRegex(search), "i");
        query.$or = [
          { clientName: term },
          { companyName: term },
          { email: term },
          { phone: term },
          { requestedPlan: term },
          { requestedSpace: term },
        ];
      }

      const skip = (page - 1) * limit;

      const [enquiries, total] = await Promise.all([
        SpacePortalEnquiryModel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        SpacePortalEnquiryModel.countDocuments(query),
      ]);

      const mappedEnquiries = enquiries.map((enquiry: any) => ({
        ...(enquiry.toObject ? enquiry.toObject() : enquiry),
        id: enquiry._id?.toString?.() || enquiry.id,
      }));

      return {
        success: true,
        message: "Enquiries fetched successfully",
        data: {
          enquiries: mappedEnquiries,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch enquiries",
        error: error?.message,
      };
    }
  }

  async getEnquiryById(enquiryId: string): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(enquiryId)) {
        return {
          success: false,
          message: "Invalid enquiry ID format",
        };
      }

      const enquiry = await SpacePortalEnquiryModel.findOne({
        _id: enquiryId,
        isDeleted: false,
      });

      if (!enquiry) {
        return {
          success: false,
          message: "Enquiry not found",
        };
      }

      const mappedEnquiry = {
        ...(enquiry.toObject ? enquiry.toObject() : enquiry),
        id: enquiry._id?.toString?.() || (enquiry as any).id,
      };

      return {
        success: true,
        message: "Enquiry fetched successfully",
        data: mappedEnquiry,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch enquiry",
        error: error?.message,
      };
    }
  }

  async updateEnquiry(
    enquiryId: string,
    payload: Partial<CreateEnquiryInput>
  ): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(enquiryId)) {
        return {
          success: false,
          message: "Invalid enquiry ID format",
        };
      }

      const updated = await SpacePortalEnquiryModel.findOneAndUpdate(
        { _id: enquiryId, isDeleted: false },
        payload,
        { new: true }
      );

      if (!updated) {
        return {
          success: false,
          message: "Enquiry not found",
        };
      }

      return {
        success: true,
        message: "Enquiry updated successfully",
        data: updated,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update enquiry",
        error: error?.message,
      };
    }
  }

  async updateEnquiryStatus(
    enquiryId: string,
    status: EnquiryStatus
  ): Promise<ApiResponse> {
    return this.updateEnquiry(enquiryId, { status });
  }

  async deleteEnquiry(enquiryId: string, restore = false): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(enquiryId)) {
        return {
          success: false,
          message: "Invalid enquiry ID format",
        };
      }

      const updated = await SpacePortalEnquiryModel.findByIdAndUpdate(
        enquiryId,
        { isDeleted: !restore },
        { new: true }
      );

      if (!updated) {
        return {
          success: false,
          message: "Enquiry not found",
        };
      }

      return {
        success: true,
        message: restore
          ? "Enquiry restored successfully"
          : "Enquiry deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update enquiry status",
        error: error?.message,
      };
    }
  }
}
