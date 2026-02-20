import { Request, Response } from "express";
import { Types } from "mongoose";
import { MeetingSchedulerService } from "./meetingScheduler.service";
import { GoogleCalendarService } from "./googleCalendar.service";
import { NotificationService } from "../notificationModule/services/notification.service";
import { NotificationType } from "../notificationModule/models/Notification";

// ============ Google OAuth2 Controllers ============

export const initiateGoogleAuth = async (_req: Request, res: Response) => {
  try {
    console.log("DEBUG: initiateGoogleAuth called");
    console.log(
      "DEBUG: MEETING_SCHEDULER_GOOGLE_CLIENT_ID status:",
      process.env.MEETING_SCHEDULER_GOOGLE_CLIENT_ID ? "Present" : "Missing",
    );
    console.log(
      "DEBUG: MEETING_SCHEDULER_GOOGLE_CLIENT_SECRET status:",
      process.env.MEETING_SCHEDULER_GOOGLE_CLIENT_SECRET
        ? "Present"
        : "Missing",
    );

    if (!GoogleCalendarService.isConfigured()) {
      return res.status(500).json({
        success: false,
        message: "Google OAuth not configured",
        data: {},
        error:
          "Missing MEETING_SCHEDULER_GOOGLE_CLIENT_ID or MEETING_SCHEDULER_GOOGLE_CLIENT_SECRET",
      });
    }

    const authUrl = GoogleCalendarService.getAuthUrl();

    res.status(200).json({
      success: true,
      message: "Redirect user to authorize Google Calendar access",
      data: { authUrl },
      error: {},
    });
  } catch (err) {
    console.error("Error initiating Google auth:", err);
    res.status(500).json({
      success: false,
      message: "Failed to initiate Google authentication",
      data: {},
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const handleGoogleCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        message: "Authorization code is required",
        data: {},
        error: "Missing code parameter",
      });
    }

    await GoogleCalendarService.handleCallback(code);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/admin/calendar?auth=success`);
  } catch (err) {
    console.error("Error handling Google callback:", err);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/admin/calendar?auth=error`);
  }
};

export const getAuthStatus = async (_req: Request, res: Response) => {
  try {
    const isAuthorized = GoogleCalendarService.isAuthorized();
    const isConfigured = GoogleCalendarService.isConfigured();

    res.status(200).json({
      success: true,
      message: "Auth status retrieved",
      data: {
        isConfigured,
        isAuthorized,
      },
      error: {},
    });
  } catch (err) {
    console.error("Error getting auth status:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get auth status",
      data: {},
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const revokeGoogleAuth = async (_req: Request, res: Response) => {
  try {
    const success = await GoogleCalendarService.revokeAuth();

    if (success) {
      res.status(200).json({
        success: true,
        message: "Google Calendar authorization revoked",
        data: {},
        error: {},
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to revoke authorization",
        data: {},
        error: "Revocation failed",
      });
    }
  } catch (err) {
    console.error("Error revoking Google auth:", err);
    res.status(500).json({
      success: false,
      message: "Failed to revoke Google authorization",
      data: {},
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

// ============ Meeting Controllers ============

export const getAvailability = async (req: Request, res: Response) => {
  try {
    const { days } = res.locals.validatedQuery || {
      days: parseInt(req.query.days as string) || 7,
    };

    const availability = await MeetingSchedulerService.getAvailableSlots(days);

    res.status(200).json({
      success: true,
      message: "Available slots retrieved successfully",
      data: {
        days,
        availability,
      },
      error: {},
    });
  } catch (err) {
    console.error("Error getting availability:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve available slots",
      data: {},
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const bookMeeting = async (req: Request, res: Response) => {
  try {
    const { fullName, email, phoneNumber, slotTime, notes } =
      res.locals.validatedBody || req.body;

    const result = await MeetingSchedulerService.bookMeeting({
      fullName,
      email,
      phoneNumber,
      slotTime: new Date(slotTime),
      notes,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: {},
        error: result.message,
      });
    }

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.meeting,
      error: {},
    });



  } catch (err) {
    console.error("Error booking meeting:", err);
    res.status(500).json({
      success: false,
      message: "Failed to book meeting",
      data: {},
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const getMeetingDetails = async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.meetingId as string;

    if (!Types.ObjectId.isValid(meetingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meeting ID format",
        data: {},
        error: "Invalid ObjectId",
      });
    }

    const meeting = await MeetingSchedulerService.getMeetingById(meetingId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
        data: {},
        error: "Meeting not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Meeting retrieved successfully",
      data: meeting,
      error: {},
    });
  } catch (err) {
    console.error("Error getting meeting details:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve meeting details",
      data: {},
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
export const getScheduledCalls = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const filter: any = {};
    if (startDate && endDate) {
      filter.startTime = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const meetings = await MeetingSchedulerService.getMeetings(filter);

    res.status(200).json({
      success: true,
      message: "Scheduled calls retrieved successfully",
      data: meetings,
      error: {},
    });
  } catch (err) {
    console.error("Error getting scheduled calls:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve scheduled calls",
      data: {},
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
