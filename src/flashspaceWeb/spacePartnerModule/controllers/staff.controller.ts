import { Request, Response } from "express";
import { StaffModel, StaffRole } from "../models/staff.model";
import mongoose from "mongoose";

// Get all staff members for the logged-in partner
export const getMyStaff = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user?.id as string;
    if (!partnerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const staffMembers = await StaffModel.find({
      partnerId: new mongoose.Types.ObjectId(partnerId as string),
      isDeleted: false,
    }).sort({ createdAt: -1 });

    // Map to frontend-friendly format if needed
    const formattedStaff = staffMembers.map((s) => ({
      id: s._id,
      name: s.name,
      email: s.email,
      role: s.role,
      joinedDate: s.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: formattedStaff,
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching staff" });
  }
};

// Add a new staff member
export const addStaff = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user?.id as string;
    const { name, email, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (name, email)",
      });
    }

    // Check if email already exists for this partner
    const existing = await StaffModel.findOne({
      email,
      isDeleted: false,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const newStaff = await StaffModel.create({
      partnerId: new mongoose.Types.ObjectId(partnerId as string),
      name,
      email,
      role: role || StaffRole.STAFF,
    });

    res.status(201).json({
      success: true,
      message: "Staff member added successfully",
      data: {
        id: newStaff._id,
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        joinedDate: newStaff.createdAt,
      },
    });
  } catch (error) {
    console.error("Error adding staff:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error adding staff" });
  }
};

// Update an existing staff member
export const updateStaff = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user?.id as string;
    const { id } = req.params;
    const { name, role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid staff ID" });
    }

    const staff = await StaffModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id as string),
        partnerId: new mongoose.Types.ObjectId(partnerId as string),
        isDeleted: false,
      },
      { name, role },
      { new: true },
    );

    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    res.status(200).json({
      success: true,
      message: "Staff member updated successfully",
      data: {
        id: staff._id,
        name: staff.name,
        role: staff.role,
        email: staff.email,
        joinedDate: staff.createdAt,
      },
    });
  } catch (error) {
    console.error("Error updating staff:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error updating staff" });
  }
};

// Remove a staff member (soft delete)
export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user?.id as string;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid staff ID" });
    }

    const staff = await StaffModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id as string),
        partnerId: new mongoose.Types.ObjectId(partnerId as string),
        isDeleted: false,
      },
      { isDeleted: true },
      { new: true },
    );

    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    res.status(200).json({
      success: true,
      message: "Staff member removed successfully",
    });
  } catch (error) {
    console.error("Error deleting staff:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error deleting staff" });
  }
};
