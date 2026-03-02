import { Request, Response } from "express";
import Visit from "../models/visit.model";

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

    const validStatuses = ["Pending", "Completed"];
    if (!status || !validStatuses.includes(status)) {
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
