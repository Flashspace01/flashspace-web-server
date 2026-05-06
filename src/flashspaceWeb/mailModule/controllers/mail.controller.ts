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

    const photo = req.file ? `/uploads/profile-pictures/${req.file.filename}` : undefined;

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
      photo,
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
              photo: newMail.photo,
              actionUrl: "/dashboard/mail-records",
            },
            { preferenceKey: "push" },
          ).catch(err => console.error("[createMail] Notification failed:", err));

          // 2. Email notification
          EmailUtil.sendMailRecordEmail(
            normalizedEmail,
            (clientUser as any).fullName || client,
            { sender, type, office: space, photo: newMail.photo }
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
    const { email, search, status } = req.query;
    let filter: any = {};

    if (req.user && req.user.role === "partner") {
      filter.partnerId = req.user.id;
    }

    if (email) {
      const emailRegex = new RegExp("^" + email.toString().trim() + "$", "i");
      filter.$or = [
        { email: { $regex: emailRegex } },
        { clientEmail: { $regex: emailRegex } },
      ];
    }

    if (search) {
      const searchRegex = new RegExp(search.toString().trim(), "i");
      filter.$or = [
        ...(filter.$or || []),
        { client: { $regex: searchRegex } },
        { sender: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
      ];
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const totalCount = await Mail.countDocuments(filter);
    const pendingCount = await Mail.countDocuments({ ...filter, status: "Pending Action" });
    const collectedCount = await Mail.countDocuments({ ...filter, status: "Collected" });
    const mails = await Mail.find(filter)
      .lean()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Fetch real names from UserModel based on emails
    const uniqueEmails = [...new Set(mails.map((m: any) => m.email?.toLowerCase().trim()).filter(Boolean))];
    const users = await UserModel.find({ email: { $in: uniqueEmails } }).select("email fullName").lean();
    const emailToName = Object.fromEntries(users.map((u: any) => [u.email.toLowerCase(), u.fullName]));

    const mappedMails = mails.map((m: any) => {
      const emailKey = m.email?.toLowerCase().trim();
      return {
        ...m,
        client: emailToName[emailKey] || m.client,
        mailId: m.mailId || m._id?.toString(),
        documentUrl: m.photo, // Map photo to documentUrl for frontend consistency
      };
    });

    res.status(200).json({
      success: true,
      data: mappedMails,
      pagination: {
        total: totalCount,
        pending: pendingCount,
        collected: collectedCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
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
    const { status, clientDecision, userCollectedStatus } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (clientDecision) updateData.clientDecision = clientDecision;
    if (userCollectedStatus) updateData.userCollectedStatus = userCollectedStatus;

    // Special logic for client requests from User Dashboard
    if (req.user?.role === 'user' || !req.user?.role) {
      if (status === 'Forwarded') {
        // User requested forward, but status should remain 'Pending Action' until partner acts
        delete updateData.status;
        updateData.clientDecision = 'Forward Requested';
      }
      if (status === 'Collected') {
        // User marked as collected (received), but status should remain 'Forwarded' or 'Pending' until partner acts
        delete updateData.status;
        updateData.userCollectedStatus = 'Collected';
      }
    }

    const updatedMail = await Mail.findByIdAndUpdate(
      id,
      updateData,
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
