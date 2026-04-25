import { Request, Response } from "express";
import Visit from "../models/visit.model";
import { UserModel } from "../../authModule/models/user.model";
import { NotificationType } from "../../notificationModule/models/Notification";
import { NotificationService } from "../../notificationModule/services/notification.service";
import { EmailUtil } from "../../authModule/utils/email.util";

export const getVisits = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    let filter: any = {};

    // If a specific email is requested (e.g. from the client dashboard)
    if (email) {
      const emailRegex = new RegExp("^" + email.toString().trim() + "$", "i");
      filter.$or = [
        { email: { $regex: emailRegex } },
        { clientEmail: { $regex: emailRegex } },
      ];
    } else if (req.user && req.user.role === "partner") {
      // If it's the partner dashboard requesting all records, only show THEIR records
      filter.partnerId = req.user.id;
    }

    const visits = await Visit.find(filter).lean().sort({ createdAt: -1 });
    const mappedVisits = visits.map((v: any) => ({
      ...v,
      visitId: v.visitId || v._id?.toString(),
    }));

    res.status(200).json({ success: true, data: mappedVisits });
  } catch (error: any) {
    console.error("Error fetching visits:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch visits",
      error: error.message || error,
    });
  }
};

export const createVisit = async (req: Request, res: Response) => {
  try {
    const { client, visitor, email, purpose, space, date } = req.body;

    if (!client || !visitor || !email || !purpose || !space) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Partner who is logging this
    const partnerId = req.user?.id;
    if (!partnerId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized. Partner ID missing." });
    }

    const newVisit = new Visit({
      partnerId,
      client,
      visitor,
      email: email.trim(), // Sanitize email
      purpose,
      space,
      date: date ? new Date(date) : undefined,
    });

    await newVisit.save();

    // Notify client user (if account exists for the provided email)
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const clientUser = await UserModel.findOne({
        email: normalizedEmail,
        isDeleted: { $ne: true },
      })
        .select("_id")
        .lean();

      if (clientUser?._id) {
        // 1. In-app notification
        await NotificationService.notifyUser(
          clientUser._id.toString(),
          "New Visit Record Added",
          `A visitor entry for ${visitor} has been logged at ${space}.`,
          NotificationType.INFO,
          {
            visitId: newVisit._id,
            type: "visit_record",
            visitor,
            space,
            actionUrl: "/dashboard/visit-records",
          },
          { preferenceKey: "loginAlerts" },
        );

        // 2. Email notification
        try {
          await EmailUtil.sendVisitRecordEmail(
            normalizedEmail,
            (clientUser as any).fullName || client,
            { visitor, purpose, office: space }
          );
        } catch (emailErr) {
          console.error("[createVisit] Email failed:", emailErr);
        }
      }
    } catch (notifError) {
      console.error("[createVisit] Failed to notify client user:", notifError);
    }

    res.status(201).json({ success: true, data: newVisit });
  } catch (error: any) {
    console.error("Error creating visit record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create visit",
      error: error.message || error,
    });
  }
};

export const updateVisitStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`[DEBUG] Updating Visit ${id} to status: ${status}`);
    const validStatuses = ["Pending", "Forwarded", "Completed"];
    if (!status || !validStatuses.includes(status)) {
      console.log(`[DEBUG] Validation failed. Received: ${status}, Allowed: ${validStatuses}`);
      return res.status(400).json({
        success: false,
        message: "Invalid or missing status provided.",
      });
    }

    const updatedVisit = await Visit.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!updatedVisit) {
      return res
        .status(404)
        .json({ success: false, message: "Visit not found" });
    }

    // Notify Partner if the client requested forwarding for the visit
    if (status === "Forwarded") {
      try {
        await NotificationService.notifyUser(
          updatedVisit.partnerId.toString(),
          "Visit Forwarding Requested",
          `The client for visit ${updatedVisit.visitId} (${updatedVisit.visitor}) has requested forwarding/info.`,
          NotificationType.INFO,
          {
            visitId: updatedVisit._id,
            type: "visit_forward_request",
            visitor: updatedVisit.visitor,
            client: updatedVisit.client,
            actionUrl: "/spaceportal/mail-visits",
          },
          { preferenceKey: "push" },
        );
      } catch (notifError) {
        console.error("[updateVisitStatus] Notification failed:", notifError);
      }
    }

    res.status(200).json({ success: true, data: updatedVisit });
  } catch (error: any) {
    console.error("Error updating visit status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update visit status",
      error: error.message || error,
    });
  }
};
