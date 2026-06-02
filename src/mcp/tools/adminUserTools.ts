import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AdminService } from "../../flashspaceWeb/adminModule/services/admin.service";

export function registerAdminUserTools(mcpServer: McpServer) {
  const adminService = new AdminService();

  const mockAdminUser = {
    role: "super_admin",
    id: "mcp-system",
  };

  mcpServer.tool(
    "get_users_admin",
    "Fetch paginated users with optional search, role filtering, and deleted status for the admin portal.",
    {
      page: z.number().optional().describe("Page number (default: 1)"),
      limit: z.number().optional().describe("Items per page (default: 10)"),
      search: z.string().optional().describe("Search term for name or email"),
      deleted: z.boolean().optional().describe("Include deleted users (default: false)"),
      role: z.string().optional().describe("Filter by specific role or 'all'"),
    },
    async ({ page = 1, limit = 10, search, deleted = false, role = "all" }) => {
      try {
        const response = await adminService.getUsers(page, limit, search, deleted, role);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching users: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_partner_users",
    "Fetch all partner users along with their properties and spaces.",
    {},
    async () => {
      try {
        const response = await adminService.getPartnerUsers();
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching partner users: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "create_user_admin",
    "Create a new user directly from the admin panel.",
    {
      fullName: z.string(),
      email: z.string().email(),
      password: z.string(),
      role: z.string().optional().describe("User role (default: User)"),
      phoneNumber: z.string().optional(),
    },
    async (userData) => {
      try {
        const response = await adminService.createUser(userData);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error creating user: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "update_user_admin",
    "Update an existing user's details.",
    {
      id: z.string().describe("The user ID to update"),
      updates: z.record(z.string(), z.any()).describe("A JSON object containing fields to update"),
    },
    async ({ id, updates }) => {
      try {
        const response = await adminService.updateUser(id, updates);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error updating user: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "delete_user_admin",
    "Soft delete or restore a user.",
    {
      id: z.string().describe("The user ID to delete or restore"),
      restore: z.boolean().optional().describe("If true, restores the user. If false, soft deletes. (default: false)"),
    },
    async ({ id, restore = false }) => {
      try {
        const response = await adminService.deleteUser(id, restore);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error changing user status: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_clients_admin",
    "Fetch clients (users who have bookings).",
    {
      page: z.number().optional().describe("Page number (default: 1)"),
      limit: z.number().optional().describe("Items per page (default: 10)"),
      search: z.string().optional().describe("Search term for name or email"),
    },
    async ({ page = 1, limit = 10, search }) => {
      try {
        const response = await adminService.getClients(mockAdminUser, page, limit, search);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching clients: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_client_details",
    "Fetch detailed information about a specific client.",
    {
      clientId: z.string().describe("The client ID"),
    },
    async ({ clientId }) => {
      try {
        const response = await adminService.getClientDetails(mockAdminUser, clientId);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching client details: ${error.message}` }], isError: true };
      }
    }
  );
}
