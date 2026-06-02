import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AdminService } from "../../flashspaceWeb/adminModule/services/admin.service";

export function registerAdminDashboardTools(mcpServer: McpServer) {
  const adminService = new AdminService();

  // Mock an admin user for MCP operations since MCP has full system access
  const mockAdminUser = {
    role: "super_admin",
    id: "mcp-system",
  };

  mcpServer.tool(
    "get_admin_dashboard_stats",
    "Fetch high-level dashboard statistics for the admin portal, including total users, active bookings, revenue, and open tickets.",
    {},
    async () => {
      try {
        const response = await adminService.getDashboardStats(mockAdminUser);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching admin stats: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_revenue_dashboard",
    "Fetch revenue dashboard statistics for the admin portal.",
    {},
    async () => {
      try {
        const response = await adminService.getRevenueDashboard(mockAdminUser);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching revenue stats: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_leaderboard",
    "Fetch the leaderboard data showing top sales and top partners.",
    {},
    async () => {
      try {
        const response = await adminService.getLeaderboard();
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching leaderboard: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_track_progress_data",
    "Fetch system progress tracking data for the admin.",
    {},
    async () => {
      try {
        const response = await adminService.getTrackProgressData();
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching track progress data: ${error.message}` }], isError: true };
      }
    }
  );
}
