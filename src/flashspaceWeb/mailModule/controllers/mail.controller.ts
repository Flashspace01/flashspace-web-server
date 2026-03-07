import { Request, Response } from "express";
import Mail from "../models/mail.model";
import { getMailDocumentUrl } from "../config/multer.config";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createMail = async (req: Request, res: Response) => {
  try {
    const { client, email, clientEmail, sender, type, space } = req.body;
    const normalizedEmail = (email || clientEmail || "").toString().trim();

    if (!client || !normalizedEmail || !sender || !type || !space) {
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
      email: normalizedEmail,
      documentUrl: req.file?.filename
        ? getMailDocumentUrl(req.file.filename)
        : undefined,
      sender,
      type,
      space,
      received: new Date(),
      status: "Pending Action",
    });

    await newMail.save();
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
      const emailRegex = new RegExp(
        "^" + escapeRegex(email.toString().trim()) + "$",
        "i",
      );
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
      return res
        .status(400)
        .json({
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
