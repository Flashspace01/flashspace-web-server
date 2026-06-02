import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FinanceController } from "../../flashspaceWeb/adminModule/controllers/finance.controller";
import { AdminService } from "../../flashspaceWeb/adminModule/services/admin.service";

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

export function registerAdminFinanceTools(mcpServer: McpServer) {
  const adminService = new AdminService();
  const mockAdminUser = { role: "super_admin", id: "mcp-system" };

  mcpServer.tool(
    "get_finance_summary",
    "Fetch overall finance summary including receivables and payables.",
    {},
    async () => {
      try {
        const req: any = {};
        const res = createMockRes();
        await FinanceController.getFinanceSummary(req, res);
        return { content: [{ type: "text", text: JSON.stringify(res.getResponse(), null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching finance summary: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_balance_sheet",
    "Fetch the balance sheet details.",
    {},
    async () => {
      try {
        const req: any = {};
        const res = createMockRes();
        await FinanceController.getBalanceSheet(req, res);
        return { content: [{ type: "text", text: JSON.stringify(res.getResponse(), null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching balance sheet: ${error.message}` }], isError: true };
      }
    }
  );

  mcpServer.tool(
    "get_admin_invoices",
    "Fetch all platform invoices.",
    {
      page: z.number().optional().describe("Default: 1"),
      limit: z.number().optional().describe("Default: 10"),
    },
    async ({ page = 1, limit = 10 }) => {
      try {
        const response = await adminService.getAllInvoices(mockAdminUser, page, limit, {});
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching invoices: ${error.message}` }], isError: true };
      }
    }
  );
}
