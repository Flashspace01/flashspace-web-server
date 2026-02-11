import { Types } from "mongoose";
import { ApiResponse } from "../../authModule/types/auth.types";
import { SpacePortalCalendarBookingModel } from "../models/calendarBooking.model";
import {
  SpacePortalBookingRequestModel,
  BookingRequestStatus,
} from "../models/bookingRequest.model";

export type ListBookingsParams = {
  spaceId?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
};

export type ListBookingRequestsParams = {
  status?: BookingRequestStatus;
  page?: number;
  limit?: number;
};

export class SpacePortalBookingsService {
  async getBookings(params: ListBookingsParams): Promise<ApiResponse> {
    try {
      const { spaceId, fromDate, toDate, page = 1, limit = 20 } = params;

      const query: any = { isDeleted: false };
      if (spaceId) query.space = spaceId;
      if (fromDate || toDate) {
        query.startTime = {};
        if (fromDate) query.startTime.$gte = fromDate;
        if (toDate) query.startTime.$lte = toDate;
      }

      const skip = (page - 1) * limit;

      const [bookings, total] = await Promise.all([
        SpacePortalCalendarBookingModel.find(query)
          .sort({ startTime: -1 })
          .skip(skip)
          .limit(limit),
        SpacePortalCalendarBookingModel.countDocuments(query),
      ]);

      const mappedBookings = bookings.map((booking: any) => ({
        id: booking._id?.toString(),
        clientName: booking.clientName,
        space: booking.space,
        startTime: booking.startTime?.toISOString?.() || booking.startTime,
        endTime: booking.endTime?.toISOString?.() || booking.endTime,
        status: booking.status,
      }));

      return {
        success: true,
        message: "Bookings fetched successfully",
        data: {
          bookings: mappedBookings,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch bookings",
        error: error?.message,
      };
    }
  }

  async createBooking(payload: {
    clientName: string;
    space: string;
    startTime: Date;
    endTime: Date;
    status: string;
    planName?: string;
    amount?: number;
  }): Promise<ApiResponse> {
    try {
      const created = await SpacePortalCalendarBookingModel.create(payload);

      return {
        success: true,
        message: "Booking created successfully",
        data: created,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to create booking",
        error: error?.message,
      };
    }
  }

  async getBookingRequests(
    params: ListBookingRequestsParams
  ): Promise<ApiResponse> {
    try {
      const { status, page = 1, limit = 20 } = params;

      const query: any = { isDeleted: false };
      if (status) query.status = status;

      const skip = (page - 1) * limit;

      const [requests, total] = await Promise.all([
        SpacePortalBookingRequestModel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        SpacePortalBookingRequestModel.countDocuments(query),
      ]);

      const mappedRequests = requests.map((request: any) => ({
        id: request._id?.toString(),
        clientName: request.clientName,
        space: request.space,
        requestedDate: request.requestedDate
          ? new Date(request.requestedDate).toISOString().slice(0, 10)
          : "",
        requestedTime: request.requestedTime,
        status: request.status,
      }));

      return {
        success: true,
        message: "Booking requests fetched successfully",
        data: {
          requests: mappedRequests,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch booking requests",
        error: error?.message,
      };
    }
  }

  async createBookingRequest(payload: {
    clientName: string;
    space: string;
    requestedDate: Date;
    requestedTime: string;
  }): Promise<ApiResponse> {
    try {
      const created = await SpacePortalBookingRequestModel.create({
        ...payload,
        status: BookingRequestStatus.PENDING,
      });

      return {
        success: true,
        message: "Booking request created successfully",
        data: created,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to create booking request",
        error: error?.message,
      };
    }
  }

  async updateRequestStatus(
    requestId: string,
    status: BookingRequestStatus
  ): Promise<ApiResponse> {
    try {
      if (!Types.ObjectId.isValid(requestId)) {
        return {
          success: false,
          message: "Invalid request ID format",
        };
      }

      const updated = await SpacePortalBookingRequestModel.findOneAndUpdate(
        { _id: requestId, isDeleted: false },
        { status },
        { new: true }
      );

      if (!updated) {
        return {
          success: false,
          message: "Booking request not found",
        };
      }

      return {
        success: true,
        message: "Booking request updated successfully",
        data: updated,
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to update booking request",
        error: error?.message,
      };
    }
  }
}
