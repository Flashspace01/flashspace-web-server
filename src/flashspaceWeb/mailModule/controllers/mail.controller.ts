import { Request, Response } from "express";
import Mail from "../models/mail.model";
import { UserModel } from "../../authModule/models/user.model";
import { NotificationType } from "../../notificationModule/models/Notification";
import { NotificationService } from "../../notificationModule/services/notification.service";
import { EmailUtil } from "../../authModule/utils/email.util";

export const createMail = async (req: Request, res: Response) => {
  try {
    const { client, email, sender, type, space } = req.body;

    if (!client || !email || !sender || !type || !space) {
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

    const mailId = `MAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newMail = new Mail({
      mailId,
      partnerId,
      client,
      email: email.trim(), // Sanitize email
      sender,
      type,
      space,
      received: new Date(),
      status: "Pending Action",
    });

    await newMail.save();

    // Notify client user (if account exists for the provided email)
    (async () => {
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const clientUser = await UserModel.findOne({
          email: normalizedEmail,
          isDeleted: { $ne: true },
        })
          .select("_id fullName")
          .lean();

        if (clientUser?._id) {
          // 1. In-app notification
          NotificationService.notifyUser(
            clientUser._id.toString(),
            "New Mail Record Added",
            `A new mail item from ${sender} has been logged for ${space}.`,
            NotificationType.INFO,
            {
              mailId: newMail._id,
              type: "mail_record",
              sender,
              space,
              actionUrl: "/dashboard/mail-records",
            },
            { preferenceKey: "push" },
          ).catch(err => console.error("[createMail] Notification failed:", err));

          // 2. Email notification
          EmailUtil.sendMailRecordEmail(
            normalizedEmail,
            (clientUser as any).fullName || client,
            { sender, type, office: space }
          ).catch(emailErr => console.error("[createMail] Email failed:", emailErr));
        }
      } catch (notifError) {
        console.error("[createMail] Background notification process failed:", notifError);
      }
    })();

    res.status(201).json({ success: true, data: newMail });
  } catch (error) {
    console.error("[createMail] Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create mail record", error });
  }
};

export const getMails = async (req: Request, res: Response) => {
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

    const mails = await Mail.find(filter).lean().sort({ createdAt: -1 });
    const mappedMails = mails.map((m: any) => ({
      ...m,
      mailId: m.mailId || m._id?.toString(),
    }));

    res.status(200).json({ success: true, data: mappedMails });
  } catch (error) {
    console.error("[getMails] Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch mail records", error });
  }
};

export const updateMailStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Pending Action", "Forwarded", "Collected"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing status provided.",
      });
    }

    const updatedMail = await Mail.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!updatedMail) {
      return res
        .status(404)
        .json({ success: false, message: "Mail record not found" });
    }

    // Notify Partner if the client requested forwarding
    if (status === "Forwarded") {
      try {
        await NotificationService.notifyUser(
          updatedMail.partnerId.toString(),
          "Mail Forwarding Requested",
          `A client has requested forwarding for mail item ${updatedMail.mailId} (from ${updatedMail.sender}).`,
          NotificationType.INFO,
          {
            mailId: updatedMail._id,
            type: "mail_forward_request",
            sender: updatedMail.sender,
            client: updatedMail.client,
            actionUrl: "/spaceportal/mail-visits",
          },
          { preferenceKey: "push" },
        );
      } catch (notifError) {
        console.error("[updateMailStatus] Notification failed:", notifError);
      }
    }

    res.status(200).json({ success: true, data: updatedMail });
  } catch (error: any) {
    console.error("Error updating mail status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update mail status",
      error: error.message || error,
    });
  }
};
