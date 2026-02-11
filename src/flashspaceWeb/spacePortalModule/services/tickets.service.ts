import { Types } from "mongoose";
import { ApiResponse } from "../../authModule/types/auth.types";
import { SupportTicketModel } from "../../userDashboardModule/models/supportTicket.model";
import { BookingModel } from "../../userDashboardModule/models/booking.model";
import { UserModel } from "../../authModule/models/user.model";

export type ListTicketsParams = {
  search?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeStatus = (value?: string) => {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  switch (upper) {
    case "OPEN":
      return "open";
    case "IN_PROGRESS":
      return "in_progress";
    case "WAITING_CUSTOMER":
      return "waiting_customer";
    case "RESOLVED":
      return "resolved";
    case "CLOSED":
      return "closed";
    default:
      return value.toLowerCase();
  }
};

const normalizePriority = (value?: string) =>
  value ? value.toLowerCase() : undefined;

const toUiStatus = (value?: string) => {
  if (!value) return "OPEN";
  switch (value) {
    case "open":
      return "OPEN";
    case "in_progress":
    case "waiting_customer":
      return "IN_PROGRESS";
    case "resolved":
      return "RESOLVED";
    case "closed":
      return "CLOSED";
    default:
      return value.toUpperCase();
  }
};

const toUiPriority = (value?: string) => {
  if (!value) return "MEDIUM";
  return value.toUpperCase();
};

const mapTicketToUi = (ticket: any, spaceFromBooking?: string) => {
  const userName =
    typeof ticket.user === "object" && ticket.user
      ? ticket.user.fullName
      : undefined;

  const assignedName =
    typeof ticket.assignedTo === "object" && ticket.assignedTo
      ? ticket.assignedTo.fullName
      : undefined;

  return {
    id: ticket.ticketNumber || ticket._id?.toString(),
    title: ticket.subject,
    description: ticket.messages?.[0]?.message || ticket.subject || "",
    clientName: userName || "",
    space: spaceFromBooking || ticket.bookingId || "",
    createdAt: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : "",
    status: toUiStatus(ticket.status),
    priority: toUiPriority(ticket.priority),
    assignedTo: assignedName || "",
  };
};

const resolveAssignedToId = async (assignedTo?: string) => {
  if (!assignedTo) return undefined;

  if (Types.ObjectId.isValid(assignedTo)) return assignedTo;

  const user = await UserModel.findOne({
    $or: [
      { email: new RegExp(`^${escapeRegex(assignedTo)}$`, "i") },
      { fullName: new RegExp(`^${escapeRegex(assignedTo)}$`, "i") },
    ],
    isDeleted: false,
  }).select("_id");

  return user?._id?.toString();
};

const buildBookingSpaceMap = async (tickets: any[]) => {
  const bookingIds = tickets
    .map((t) => t.bookingId)
    .filter((id) => id && Types.ObjectId.isValid(id));

  if (bookingIds.length === 0) return new Map<string, string>();

  const bookings = await BookingModel.find({
    _id: { $in: bookingIds },
  }).select("spaceSnapshot.name spaceId");

  const map = new Map<string, string>();
  bookings.forEach((b: any) => {
    const name = b.spaceSnapshot?.name || b.spaceId || "";
    map.set(b._id.toString(), name);
  });

  return map;
};

export class SpacePortalTicketsService {
  async getTickets(params: ListTicketsParams): Promise<ApiResponse> {
    try {
      const {
        search,
        status,
        priority,
        page = 1,
        limit = 10,
        includeDeleted = false,
      } = params;

      const query: any = {
        isDeleted: includeDeleted ? { $in: [true, false] } : false,
      };

      const normalizedStatus = normalizeStatus(status);
      const normalizedPriority = normalizePriority(priority);

      if (normalizedStatus) query.status = normalizedStatus;
      if (normalizedPriority) query.priority = normalizedPriority;

      const hasSearch = Boolean(search);

      const skip = (page - 1) * limit;

      const baseQuery = SupportTicketModel.find(query)
        .sort({ createdAt: -1 })
        .populate("user", "fullName email")
        .populate("assignedTo", "fullName email");

      const tickets = hasSearch
        ? await baseQuery
        : await baseQuery.skip(skip).limit(limit);

      const total = hasSearch
        ? tickets.length
        : await SupportTicketModel.countDocuments(query);

      const bookingSpaceMap = await buildBookingSpaceMap(tickets);
      const mappedTickets = tickets.map((ticket: any) =>
        mapTicketToUi(ticket, bookingSpaceMap.get(ticket.bookingId) || "")
      );

      const normalizedSearch = search?.toLowerCase().trim();
      const filteredTickets = hasSearch
        ? mappedTickets.filter((ticket) => {
            if (!normalizedSearch) return true;
            return (
              ticket.id?.toLowerCase?.().includes(normalizedSearch) ||
              ticket.title?.toLowerCase?.().includes(normalizedSearch) ||
              ticket.description?.toLowerCase?.().includes(normalizedSearch) ||
              ticket.clientName?.toLowerCase?.().includes(normalizedSearch) ||
              ticket.space?.toLowerCase?.().includes(normalizedSearch)
            );
          })
        : mappedTickets;

      const paginatedTickets = hasSearch
        ? filteredTickets.slice(skip, skip + limit)
        : filteredTickets;

      return {
        success: true,
        message: "Tickets fetched successfully",
        data: {
          tickets: paginatedTickets,
          pagination: {
            total: hasSearch ? filteredTickets.length : total,
            page,
            pages: Math.ceil(
              (hasSearch ? filteredTickets.length : total) / limit
            ),
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch tickets",
        error: error?.message,
      };
    }
  }

  async getTicketById(ticketId: string): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(ticketId)) {
        return {
          success: false,
          message: "Invalid ticket ID format",
        };
      }

      const ticket = await SupportTicketModel.findOne({
        _id: ticketId,
        isDeleted: false,
      })
        .populate("user", "fullName email")
        .populate("assignedTo", "fullName email");

      if (!ticket) {
        return {
          success: false,
          message: "Ticket not found",
        };
      }

      let space = "";
      if (ticket.bookingId && Types.ObjectId.isValid(ticket.bookingId)) {
        const booking = await BookingModel.findById(ticket.bookingId).select(
          "spaceSnapshot.name spaceId"
        );
        space = booking?.spaceSnapshot?.name || booking?.spaceId || "";
      }

      return {
        success: true,
        message: "Ticket fetched successfully",
        data: mapTicketToUi(ticket, space),
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch ticket",
        error: error?.message,
      };
    }
  }

  async updateTicket(
    ticketId: string,
    payload: { status?: string; priority?: string; assignedTo?: string }
  ): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(ticketId)) {
        return {
          success: false,
          message: "Invalid ticket ID format",
        };
      }

      const normalizedStatus = normalizeStatus(payload.status);
      const normalizedPriority = normalizePriority(payload.priority);
      const assignedToId = await resolveAssignedToId(payload.assignedTo);
      if (payload.assignedTo && !assignedToId) {
        return {
          success: false,
          message: "Assigned user not found",
        };
      }
      const updatePayload: any = { ...payload };

      if (payload.status) updatePayload.status = normalizedStatus;
      if (payload.priority) updatePayload.priority = normalizedPriority;
      if (payload.assignedTo) updatePayload.assignedTo = assignedToId;

      const updated = await SupportTicketModel.findOneAndUpdate(
        { _id: ticketId, isDeleted: false },
        updatePayload,
        { new: true }
      )
        .populate("user", "fullName email")
        .populate("assignedTo", "fullName email");

      if (!updated) {
        return {
          success: false,
          message: "Ticket not found",
        };
      }

      return {
        success: true,
        message: "Ticket updated successfully",
        data: mapTicketToUi(updated),
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update ticket",
        error: error?.message,
      };
    }
  }
}
