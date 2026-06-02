import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AdminService } from "../../flashspaceWeb/adminModule/services/admin.service";

export function registerAdminSpaceTools(mcpServer: McpServer) {
  const adminService = new AdminService();

  mcpServer.tool(
    "get_all_platform_spaces",
    "Fetch all spaces across the platform with filtering options for admin.",
    {
      page: z.number().optional().describe("Default: 1"),
      limit: z.number().optional().describe("Default: 10"),
      search: z.string().optional(),
      status: z.string().optional(),
      type: z.enum(["CoworkingSpace", "VirtualOffice", "MeetingRoom", "all"]).optional(),
      partner: z.string().optional(),
    },
    async ({ page = 1, limit = 10, search, status, type = "all", partner }) => {
      try {
        const filters = { search, status, type, partner };
        const response = await adminService.getAllSpaces(page, limit, filters);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching all spaces: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_pending_spaces",
    "Fetch spaces awaiting admin approval.",
    {},
    async () => {
      try {
        const response = await adminService.getPendingSpaces();
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching pending spaces: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "approve_space",
    "Approve or reject a new space listing.",
    {
      spaceType: z.enum(["coworking", "virtual", "meeting"]),
      id: z.string().describe("The ID of the space"),
      adminMarkups: z.record(z.string(), z.any()).optional().describe("Optional markups to apply during approval"),
    },
    async ({ spaceType, id, adminMarkups }) => {
      try {
        const response = await adminService.approveSpace(spaceType, id, adminMarkups);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error approving space: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "list_space_on_behalf",
    "Admin tool to list a space on behalf of a partner.",
    {
      partnerId: z.string(),
      spaceType: z.enum(["coworking", "meeting_room", "virtual_office"]),
      propertyData: z.record(z.string(), z.any()),
      spaceData: z.record(z.string(), z.any()),
    },
    async ({ partnerId, spaceType, propertyData, spaceData }) => {
      try {
        const response = await adminService.listSpaceOnBehalf(partnerId, spaceType, propertyData, spaceData);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error listing space on behalf: ${error.message}` }], isError: true };
      }
    }
  );
}
