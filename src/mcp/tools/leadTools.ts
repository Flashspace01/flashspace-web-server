import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LeadModel } from "../../flashspaceWeb/leadModule/lead.model";
import { VisitModel } from "../../flashspaceWeb/visitModule/models/visit.model";

export function registerLeadTools(mcpServer: McpServer) {
  // 1. get_new_leads
  mcpServer.tool(
    "get_new_leads",
    "Get the most recent leads from the system",
    { limit: z.number().optional().describe("Number of leads to fetch (default: 5)") },
    async ({ limit = 5 }) => {
      try {
        const leads = await LeadModel.find().sort({ createdAt: -1 }).limit(limit).lean();
        return { content: [{ type: "text", text: JSON.stringify(leads, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching leads: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. update_lead_status
  mcpServer.tool(
    "update_lead_status",
    "Update the status of a specific lead (e.g. 'New', 'Contacted', 'Converted')",
    { 
      leadId: z.string(),
      status: z.string().describe("The new status to assign to the lead")
    },
    async ({ leadId, status }) => {
      try {
        const lead = await LeadModel.findByIdAndUpdate(
          leadId,
          { status },
          { new: true }
        ).lean();

        if (!lead) {
          return { content: [{ type: "text", text: `No lead found with ID: ${leadId}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Lead status successfully updated to ${status}:\n${JSON.stringify(lead, null, 2)}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error updating lead status: ${error.message}` }], isError: true };
      }
    }
  );

  // 3. get_scheduled_visits
  mcpServer.tool(
    "get_scheduled_visits",
    "Get recent scheduled site visits",
    { limit: z.number().optional().describe("Number of scheduled visits to fetch (default: 5)") },
    async ({ limit = 5 }) => {
      try {
        const visits = await VisitModel.find().sort({ scheduledDate: -1 }).limit(limit).populate("user property").lean();
        return { content: [{ type: "text", text: JSON.stringify(visits, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching scheduled visits: ${error.message}` }], isError: true };
      }
    }
  );
}
