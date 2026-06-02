import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { UserModel } from "../../flashspaceWeb/authModule/models/user.model";

export function registerUserTools(mcpServer: McpServer) {
  // 1. find_user_by_email
  mcpServer.tool(
    "find_user_by_email",
    "Find a user in the FlashSpace database by their email address",
    { email: z.string().email() },
    async ({ email }) => {
      try {
        const user = await UserModel.findOne({ email }).select("-password").lean();
        if (!user) {
          return { content: [{ type: "text", text: `No user found with email: ${email}` }] };
        }
        return { content: [{ type: "text", text: JSON.stringify(user, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching user: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. get_recent_users
  mcpServer.tool(
    "get_recent_users",
    "Get the most recently registered users in FlashSpace",
    { limit: z.number().optional().describe("Number of users to fetch (default: 5)") },
    async ({ limit = 5 }) => {
      try {
        const users = await UserModel.find().sort({ createdAt: -1 }).limit(limit).select("-password").lean();
        return { content: [{ type: "text", text: JSON.stringify(users, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching users: ${error.message}` }], isError: true };
      }
    }
  );

  // 3. update_user_role
  mcpServer.tool(
    "update_user_role",
    "Update a user's role in the system (e.g. 'User', 'Admin', 'Affiliate')",
    { 
      email: z.string().email(),
      role: z.string().describe("The new role to assign to the user")
    },
    async ({ email, role }) => {
      try {
        const user = await UserModel.findOneAndUpdate(
          { email },
          { role },
          { new: true }
        ).select("-password").lean();

        if (!user) {
          return { content: [{ type: "text", text: `No user found with email: ${email}` }], isError: true };
        }
        return { content: [{ type: "text", text: `User role successfully updated to ${role}:\n${JSON.stringify(user, null, 2)}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error updating user role: ${error.message}` }], isError: true };
      }
    }
  );
}
