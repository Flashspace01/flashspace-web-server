import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BookingModel } from "../../flashspaceWeb/bookingModule/booking.model";

export function registerBookingTools(mcpServer: McpServer) {
  // 1. get_recent_bookings
  mcpServer.tool(
    "get_recent_bookings",
    "Get the most recent bookings in the system",
    { limit: z.number().optional().describe("Number of bookings to fetch (default: 5)") },
    async ({ limit = 5 }) => {
      try {
        const bookings = await BookingModel.find().sort({ createdAt: -1 }).limit(limit).populate("user spaceId").lean();
        return { content: [{ type: "text", text: JSON.stringify(bookings, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching bookings: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. get_booking_by_id
  mcpServer.tool(
    "get_booking_by_id",
    "Get details of a specific booking using its ID",
    { bookingId: z.string().describe("The unique ID of the booking") },
    async ({ bookingId }) => {
      try {
        const booking = await BookingModel.findById(bookingId).populate("user spaceId").lean();
        if (!booking) {
          return { content: [{ type: "text", text: `No booking found with ID: ${bookingId}` }], isError: true };
        }
        return { content: [{ type: "text", text: JSON.stringify(booking, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching booking: ${error.message}` }], isError: true };
      }
    }
  );

  // 3. update_booking_status
  mcpServer.tool(
    "update_booking_status",
    "Update the status of a booking (e.g. 'Pending', 'Confirmed', 'Cancelled')",
    { 
      bookingId: z.string(),
      status: z.string().describe("The new status to assign to the booking")
    },
    async ({ bookingId, status }) => {
      try {
        const booking = await BookingModel.findByIdAndUpdate(
          bookingId,
          { status },
          { new: true }
        ).populate("user spaceId").lean();

        if (!booking) {
          return { content: [{ type: "text", text: `No booking found with ID: ${bookingId}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Booking status successfully updated to ${status}:\n${JSON.stringify(booking, null, 2)}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error updating booking status: ${error.message}` }], isError: true };
      }
    }
  );
}
