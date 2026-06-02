import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerUserTools } from "./tools/userTools";
import { registerBookingTools } from "./tools/bookingTools";
import { registerInventoryTools } from "./tools/inventoryTools";
import { registerLeadTools } from "./tools/leadTools";
import { registerMarketingTools } from "./tools/marketingTools";
import { registerAdminDashboardTools } from "./tools/adminDashboardTools";
import { registerAdminUserTools } from "./tools/adminUserTools";
import { registerAdminKycTools } from "./tools/adminKycTools";
import { registerAdminSpaceTools } from "./tools/adminSpaceTools";
import { registerAdminFinanceTools } from "./tools/adminFinanceTools";
import { registerAdminAffiliateTools } from "./tools/adminAffiliateTools";
import { registerAdminBookingTools } from "./tools/adminBookingTools";

export function createMcpServer() {
  // Initialize the MCP Server
  const mcpServer = new McpServer({
    name: "FlashSpaceAdmin",
    version: "1.0.0",
  });

  // Example Resource: Server Status
  mcpServer.resource(
    "server-status",
    "admin://status",
    async (uri) => {
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ status: "online", timestamp: new Date().toISOString() })
        }]
      };
    }
  );

  // Register all modular tools
  registerUserTools(mcpServer);
  registerBookingTools(mcpServer);
  registerInventoryTools(mcpServer);
  registerLeadTools(mcpServer);
  registerMarketingTools(mcpServer);

  // Register new Admin tools
  registerAdminDashboardTools(mcpServer);
  registerAdminUserTools(mcpServer);
  registerAdminKycTools(mcpServer);
  registerAdminSpaceTools(mcpServer);
  registerAdminFinanceTools(mcpServer);
  registerAdminAffiliateTools(mcpServer);
  registerAdminBookingTools(mcpServer);

  return mcpServer;
}
