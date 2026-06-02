import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AdminService } from "../../flashspaceWeb/adminModule/services/admin.service";
import { UserRole } from "../../flashspaceWeb/authModule/models/user.model";

export function registerAdminKycTools(mcpServer: McpServer) {
  const adminService = new AdminService();

  const mockAdminUser = {
    role: "super_admin",
    id: "mcp-system",
  };

  mcpServer.tool(
    "get_pending_kyc_requests",
    "Fetch pending (or all) KYC requests.",
    {
      includeApproved: z.boolean().optional().describe("If true, returns all KYC requests instead of just pending ones. (default: false)"),
    },
    async ({ includeApproved = false }) => {
      try {
        const response = await adminService.getPendingKYC(mockAdminUser, includeApproved);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching KYC requests: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_kyc_details",
    "Fetch full details of a specific user KYC request.",
    {
      kycId: z.string(),
    },
    async ({ kycId }) => {
      try {
        const response = await adminService.getKYCDetails(kycId);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching KYC details: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "review_kyc_document",
    "Approve or reject a specific document within a KYC request.",
    {
      kycId: z.string(),
      docId: z.string(),
      action: z.enum(["approve", "reject"]),
      rejectionReason: z.string().optional(),
    },
    async ({ kycId, docId, action, rejectionReason }) => {
      try {
        const response = await adminService.reviewKYCDocument(kycId, docId, action, rejectionReason);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error reviewing KYC document: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "review_kyc_overall",
    "Overall approval or rejection of a KYC request.",
    {
      kycId: z.string(),
      action: z.enum(["approve", "reject"]),
      rejectionReason: z.string().optional(),
    },
    async ({ kycId, action, rejectionReason }) => {
      try {
        const response = await adminService.reviewKYC(kycId, action, rejectionReason);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error reviewing KYC overall: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_partner_business_info",
    "Fetch business information details for a specific user.",
    {
      userId: z.string(),
    },
    async ({ userId }) => {
      try {
        const response = await adminService.getBusinessInfoByUser(userId);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching business info: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "update_partner_status",
    "Activate or deactivate a space partner.",
    {
      partnerId: z.string(),
      status: z.enum(["active", "inactive"]),
    },
    async ({ partnerId, status }) => {
      try {
        const response = await adminService.updatePartnerStatus(partnerId, status);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error updating partner status: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_space_partner_kyc_list",
    "Fetch a list of space partner KYC requests.",
    {
      search: z.string().optional(),
      status: z.string().optional(),
      page: z.number().optional().describe("Default: 1"),
      limit: z.number().optional().describe("Default: 10"),
    },
    async ({ search, status, page = 1, limit = 10 }) => {
      try {
        const filters = { search, status, page, limit };
        const response = await adminService.getPartnerKYCList(filters);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching partner KYC list: ${error.message}` }], isError: true };
      }
    }
  );
}
