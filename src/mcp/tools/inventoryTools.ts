import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CoworkingSpaceModel } from "../../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { MeetingRoomModel } from "../../flashspaceWeb/meetingRoomModule/meetingRoom.model";
import { PropertyModel } from "../../flashspaceWeb/propertyModule/property.model";

export function registerInventoryTools(mcpServer: McpServer) {
  // 1. list_coworking_spaces
  mcpServer.tool(
    "list_coworking_spaces",
    "Get a list of coworking spaces from the database",
    { 
      limit: z.number().optional().describe("Number of spaces to fetch (default: 10)"),
      search: z.string().optional().describe("Search term to filter by space name")
    },
    async ({ limit = 10, search }) => {
      try {
        const query: any = {};
        if (search) {
          query.name = { $regex: new RegExp(search, "i") };
        }
        const spaces = await CoworkingSpaceModel.find(query).limit(limit).populate("property").lean();
        return { content: [{ type: "text", text: JSON.stringify(spaces, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching coworking spaces: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. list_meeting_rooms
  mcpServer.tool(
    "list_meeting_rooms",
    "Get a list of meeting rooms from the database",
    { 
      limit: z.number().optional().describe("Number of meeting rooms to fetch (default: 10)"),
      search: z.string().optional().describe("Search term to filter by room name")
    },
    async ({ limit = 10, search }) => {
      try {
        const query: any = {};
        if (search) {
          query.name = { $regex: new RegExp(search, "i") };
        }
        const rooms = await MeetingRoomModel.find(query).limit(limit).populate("property").lean();
        return { content: [{ type: "text", text: JSON.stringify(rooms, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error fetching meeting rooms: ${error.message}` }], isError: true };
      }
    }
  );

  // 3. update_space_pricing
  mcpServer.tool(
    "update_space_pricing",
    "Update the pricing for a coworking space or meeting room",
    { 
      spaceId: z.string().describe("The ID of the space"),
      spaceType: z.enum(["coworking", "meeting_room"]).describe("The type of space"),
      partnerPricePerMonth: z.number().optional().describe("Base price set by the partner"),
      adminMarkupPerMonth: z.number().optional().describe("Markup added by Admin")
    },
    async ({ spaceId, spaceType, partnerPricePerMonth, adminMarkupPerMonth }) => {
      try {
        const Model = spaceType === "coworking" ? CoworkingSpaceModel : MeetingRoomModel;
        const space = await Model.findById(spaceId);
        
        if (!space) {
          return { content: [{ type: "text", text: `No space found with ID: ${spaceId}` }], isError: true };
        }

        if (partnerPricePerMonth !== undefined) space.partnerPricePerMonth = partnerPricePerMonth;
        if (adminMarkupPerMonth !== undefined) space.adminMarkupPerMonth = adminMarkupPerMonth;
        
        // Calculate final price automatically
        space.finalPricePerMonth = (space.partnerPricePerMonth || 0) + (space.adminMarkupPerMonth || 0);

        await space.save();
        
        return { content: [{ type: "text", text: `Pricing successfully updated:\n${JSON.stringify(space.toJSON(), null, 2)}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error updating pricing: ${error.message}` }], isError: true };
      }
    }
  );

  // 4. add_space_images
  mcpServer.tool(
    "add_space_images",
    "Add new image URLs to a specific space",
    { 
      spaceId: z.string().describe("The ID of the space"),
      spaceType: z.enum(["coworking", "meeting_room"]).describe("The type of space"),
      imageUrls: z.array(z.string()).describe("Array of Image URLs (Cloudinary, Imgur, etc.)")
    },
    async ({ spaceId, spaceType, imageUrls }) => {
      try {
        const Model = spaceType === "coworking" ? CoworkingSpaceModel : MeetingRoomModel;
        
        const space = await Model.findByIdAndUpdate(
          spaceId,
          { $push: { images: { $each: imageUrls } } },
          { new: true }
        ).lean();

        if (!space) {
          return { content: [{ type: "text", text: `No space found with ID: ${spaceId}` }], isError: true };
        }
        
        return { content: [{ type: "text", text: `Images successfully added:\n${JSON.stringify(space, null, 2)}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error adding images: ${error.message}` }], isError: true };
      }
    }
  );

  // 5. update_space_amenities
  mcpServer.tool(
    "update_space_amenities",
    "Add new amenities to a specific space",
    { 
      spaceId: z.string().describe("The ID of the space"),
      spaceType: z.enum(["coworking", "meeting_room"]).describe("The type of space"),
      amenities: z.array(z.string()).describe("Array of new amenities to add")
    },
    async ({ spaceId, spaceType, amenities }) => {
      try {
        const Model = spaceType === "coworking" ? CoworkingSpaceModel : MeetingRoomModel;
        
        const space = await Model.findByIdAndUpdate(
          spaceId,
          { $addToSet: { amenities: { $each: amenities } } },
          { new: true }
        ).lean();

        if (!space) {
          return { content: [{ type: "text", text: `No space found with ID: ${spaceId}` }], isError: true };
        }
        
        return { content: [{ type: "text", text: `Amenities successfully updated:\n${JSON.stringify(space, null, 2)}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error updating amenities: ${error.message}` }], isError: true };
      }
    }
  );

  // 6. update_property_details
  mcpServer.tool(
    "update_property_details",
    "Update details like name and location of a Property (which spaces are linked to)",
    { 
      propertyId: z.string().describe("The ID of the Property"),
      name: z.string().optional().describe("New name for the property"),
      city: z.string().optional().describe("New city"),
      area: z.string().optional().describe("New area")
    },
    async ({ propertyId, name, city, area }) => {
      try {
        const updates: any = {};
        if (name) updates.name = name;
        if (city) updates.city = city;
        if (area) updates.area = area;

        const property = await PropertyModel.findByIdAndUpdate(
          propertyId,
          { $set: updates },
          { new: true }
        ).lean();

        if (!property) {
          return { content: [{ type: "text", text: `No Property found with ID: ${propertyId}` }], isError: true };
        }
        
        return { content: [{ type: "text", text: `Property details successfully updated:\n${JSON.stringify(property, null, 2)}` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error updating property: ${error.message}` }], isError: true };
      }
    }
  );
}
