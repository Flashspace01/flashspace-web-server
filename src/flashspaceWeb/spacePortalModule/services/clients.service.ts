import { Types } from "mongoose";
import { ApiResponse } from "../../authModule/types/auth.types";
import {
  SpacePortalClientModel,
  ClientPlan,
  ClientStatus,
  KycStatus,
} from "../models/client.model";

export type CreateClientInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  plan: ClientPlan;
  space: string;
  startDate: Date;
  endDate: Date;
  status: ClientStatus;
  kycStatus: KycStatus;
};

export type ListClientsParams = {
  search?: string;
  status?: ClientStatus;
  plan?: ClientPlan;
  kycStatus?: KycStatus;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class SpacePortalClientsService {
  async createClient(payload: CreateClientInput): Promise<ApiResponse> {
    try {
      const createdClient = await SpacePortalClientModel.create(payload);

      return {
        success: true,
        message: "Client created successfully",
        data: createdClient,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to create client",
        error: error?.message,
      };
    }
  }

  async getClients(params: ListClientsParams): Promise<ApiResponse> {
    try {
      const {
        search,
        status,
        plan,
        kycStatus,
        page = 1,
        limit = 10,
        includeDeleted = false,
      } = params;

      const query: any = {
        isDeleted: includeDeleted ? { $in: [true, false] } : false,
      };

      if (status) query.status = status;
      if (plan) query.plan = plan;
      if (kycStatus) query.kycStatus = kycStatus;

      if (search) {
        const term = new RegExp(escapeRegex(search), "i");
        const objectIdMatch = Types.ObjectId.isValid(search)
          ? { _id: search }
          : undefined;
        query.$or = [
          { companyName: term },
          { contactName: term },
          { space: term },
          { email: term },
          { phone: term },
          ...(objectIdMatch ? [objectIdMatch] : []),
        ];
      }

      const skip = (page - 1) * limit;

      const [clients, total] = await Promise.all([
        SpacePortalClientModel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        SpacePortalClientModel.countDocuments(query),
      ]);

      const mappedClients = clients.map((client: any) => ({
        ...(client.toObject ? client.toObject() : client),
        id: client._id?.toString?.() || client.id,
      }));

      return {
        success: true,
        message: "Clients fetched successfully",
        data: {
          clients: mappedClients,
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
        message: "Failed to fetch clients",
        error: error?.message,
      };
    }
  }

  async getClientById(clientId: string): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(clientId)) {
        return {
          success: false,
          message: "Invalid client ID format",
        };
      }

      const client = await SpacePortalClientModel.findOne({
        _id: clientId,
        isDeleted: false,
      });

      if (!client) {
        return {
          success: false,
          message: "Client not found",
        };
      }

      const mappedClient = {
        ...(client.toObject ? client.toObject() : client),
        id: client._id?.toString?.() || (client as any).id,
      };

      return {
        success: true,
        message: "Client fetched successfully",
        data: mappedClient,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch client",
        error: error?.message,
      };
    }
  }

  async updateClient(
    clientId: string,
    payload: Partial<CreateClientInput>
  ): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(clientId)) {
        return {
          success: false,
          message: "Invalid client ID format",
        };
      }

      const updated = await SpacePortalClientModel.findOneAndUpdate(
        { _id: clientId, isDeleted: false },
        payload,
        { new: true }
      );

      if (!updated) {
        return {
          success: false,
          message: "Client not found",
        };
      }

      return {
        success: true,
        message: "Client updated successfully",
        data: updated,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update client",
        error: error?.message,
      };
    }
  }

  async deleteClient(clientId: string, restore = false): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(clientId)) {
        return {
          success: false,
          message: "Invalid client ID format",
        };
      }

      const updated = await SpacePortalClientModel.findByIdAndUpdate(
        clientId,
        { isDeleted: !restore },
        { new: true }
      );

      if (!updated) {
        return {
          success: false,
          message: "Client not found",
        };
      }

      return {
        success: true,
        message: restore
          ? "Client restored successfully"
          : "Client deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update client status",
        error: error?.message,
      };
    }
  }
}
