import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AdminService } from "../../flashspaceWeb/adminModule/services/admin.service";

export function registerAdminBookingTools(mcpServer: McpServer) {
  const adminService = new AdminService();

  const mockAdminUser = {
    role: "super_admin",
    id: "mcp-system",
  };

  mcpServer.tool(
    "get_all_bookings_admin",
    "Fetch platform-wide bookings for the admin.",
    {
      page: z.number().optional().describe("Default: 1"),
      limit: z.number().optional().describe("Default: 50"),
      status: z.string().optional(),
      partner: z.string().optional(),
    },
    async ({ page = 1, limit = 50, status, partner }) => {
      try {
        const filters = { status, partner };
        const response = await adminService.getAllBookings(mockAdminUser, page, limit, filters);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching all bookings: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "update_booking_status_admin",
    "Update a booking status directly from admin.",
    {
      bookingId: z.string(),
      status: z.string().describe("e.g. active, pending_payment, expired, cancelled"),
      reason: z.string().optional(),
    },
    async ({ bookingId, status, reason }) => {
      try {
        const response = await adminService.updateBookingStatus(mockAdminUser, bookingId, status, reason);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error updating booking status: ${error.message}` }], isError: true };
      }
    }
  );
}
