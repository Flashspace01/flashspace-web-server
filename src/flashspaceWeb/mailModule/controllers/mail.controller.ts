import { Request, Response } from "express";
import Mail from "../models/mail.model";

export const createMail = async (req: Request, res: Response) => {
  try {
    const {
      client,
      clientEmail,
      sender,
      type,
      space,
      trackingNumber,
      photoUrl,
      notifyClient,
    } = req.body;

    if (!client || !clientEmail || !sender || !type || !space) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const mailId = `ML-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newMail = new Mail({
      mailId,
      client,
      clientEmail,
      sender,
      type,
      space,
      trackingNumber,
      photoUrl,
      notifyClient: notifyClient !== undefined ? notifyClient : true,
      received: new Date(),
      status: "Pending Action",
    });

    await newMail.save();

    // TODO: Integrate with an actual email service to notify the client
    if (notifyClient) {
      console.log(
        `Notification sent to ${clientEmail} for ${type} from ${sender}`,
      );
    }

    res.status(201).json({ success: true, data: newMail });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to create mail record", error });
  }
};

export const getMails = async (req: Request, res: Response) => {
  try {
    const mails = await Mail.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: mails });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch mail records", error });
  }
};

export const updateMailStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

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
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update mail status", error });
  }
};
export const getUserMails = async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).user.email;

    if (!userEmail) {
      return res
        .status(401)
        .json({ success: false, message: "User email not found in token" });
    }

    const mails = await Mail.find({ clientEmail: userEmail }).sort({
      received: -1,
    });
    res.status(200).json({ success: true, data: mails });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user mail records",
      error,
    });
  }
};
