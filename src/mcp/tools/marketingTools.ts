import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CouponModel } from "../../flashspaceWeb/couponModule/coupon.model";

export function registerMarketingTools(mcpServer: McpServer) {
  // 1. list_active_coupons
  mcpServer.tool(
    "list_active_coupons",
    "Get all active discount coupons",
    {},
    async () => {
      try {
        const coupons = await CouponModel.find({ status: "active" }).lean();
        return { content: [{ type: "text", text: JSON.stringify(coupons, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching active coupons: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. create_coupon
  mcpServer.tool(
    "create_coupon",
    "Create a new discount coupon",
    { 
      code: z.string().describe("The coupon code (e.g., 'DIWALI20')"),
      discountType: z.enum(["percentage", "flat"]).describe("Type of discount"),
      discountValue: z.number().describe("The discount value (e.g. 20 for 20% or 500 for flat 500)"),
      expiryDays: z.number().optional().describe("Number of days until the coupon expires (default: 30)")
    },
    async ({ code, discountType, discountValue, expiryDays = 30 }) => {
      try {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);

        const newCoupon = new CouponModel({
          code,
          discountType,
          discountValue,
          status: "active",
          assignedClientId: "generic", // Used for all users
          createdBy: "mcp-admin",
          expiryDate
        });
        await newCoupon.save();
        
        return { content: [{ type: "text", text: `Coupon successfully created:\n${JSON.stringify(newCoupon.toJSON(), null, 2)}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error creating coupon: ${error.message}` }], isError: true };
      }
    }
  );

  // 3. assign_coupon_to_user
  mcpServer.tool(
    "assign_coupon_to_user",
    "Create and assign a special coupon to a specific user",
    { 
      userId: z.string().describe("The Mongo ID of the user"),
      code: z.string().describe("The coupon code to assign (e.g., 'SPECIAL50')"),
      discountType: z.enum(["percentage", "flat"]).describe("Type of discount"),
      discountValue: z.number().describe("The discount value"),
      expiryDays: z.number().optional().describe("Days until expiry (default: 7)")
    },
    async ({ userId, code, discountType, discountValue, expiryDays = 7 }) => {
      try {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);

        const newCoupon = new CouponModel({
          code,
          discountType,
          discountValue,
          status: "active",
          assignedClientId: userId,
          createdBy: "mcp-admin",
          expiryDate
        });
        await newCoupon.save();
        
        return { content: [{ type: "text", text: `Coupon successfully assigned to user:\n${JSON.stringify(newCoupon.toJSON(), null, 2)}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error assigning coupon: ${error.message}` }], isError: true };
      }
    }
  );
}
