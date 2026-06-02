import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAllAffiliates, getAffiliateClients } from "../../flashspaceWeb/adminModule/controllers/affiliateAdmin.controller";
import { AffiliateAdminController } from "../../flashspaceWeb/affiliatePortalModule/controllers/affiliateAdmin.controller";

// Helper to mock express Request/Response
const createMockRes = () => {
  let responseData: any = null;
  let statusCode = 200;
  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    },
    getResponse: () => ({ statusCode, data: responseData })
  };
  return res;
};

export function registerAdminAffiliateTools(mcpServer: McpServer) {

  mcpServer.tool(
    "get_all_affiliates",
    "Fetch all affiliate users and their summary statistics.",
    {},
    async () => {
      try {
        const req: any = {};
        const res = createMockRes();
        await getAllAffiliates(req, res);
        return { content: [{ type: "text", text: JSON.stringify(res.getResponse(), null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching affiliates: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_affiliate_clients",
    "Fetch all clients (bookings) for a specific affiliate.",
    {
      affiliateId: z.string(),
    },
    async ({ affiliateId }) => {
      try {
        const req: any = { params: { affiliateId } };
        const res = createMockRes();
        await getAffiliateClients(req, res);
        return { content: [{ type: "text", text: JSON.stringify(res.getResponse(), null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching affiliate clients: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_affiliate_stats",
    "Fetch commission and performance stats for a specific affiliate from AffiliateAdminController.",
    {
      affiliateId: z.string(),
    },
    async ({ affiliateId }) => {
      try {
        const req: any = { params: { id: affiliateId } };
        const res = createMockRes();
        await AffiliateAdminController.getAffiliateStats(req, res);
        return { content: [{ type: "text", text: JSON.stringify(res.getResponse(), null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching affiliate stats: ${error.message}` }], isError: true };
      }
    }
  );
}
