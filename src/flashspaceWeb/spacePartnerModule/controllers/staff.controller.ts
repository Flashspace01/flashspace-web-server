import { Request, Response } from "express";
import { PartnerStaffModel } from "../models/partnerStaff.model";
import mongoose from "mongoose";

export const getStaffMembers = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.id;
    const staff = await PartnerStaffModel.find({ partnerId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error("Error fetching staff members:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching staff members" });
  }
};

export const addStaffMember = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.id;
    const { name, email, role } = req.body;

    // Check if staff already exists for this partner
    const existingStaff = await PartnerStaffModel.findOne({ partnerId, email });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: "Staff member with this email already exists",
      });
    }

    const staffMember = new PartnerStaffModel({
      partnerId,
      name,
      email,
      role,
    });

    await staffMember.save();

    res.status(201).json({
      success: true,
      data: staffMember,
    });
  } catch (error) {
    console.error("Error adding staff member:", error);
    res
      .status(500)
      .json({ success: false, message: "Error adding staff member" });
  }
};

export const updateStaffMember = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.id;
    const { id } = req.params;
    const { name, role } = req.body;

    const staffMember = await PartnerStaffModel.findOne({ _id: id, partnerId });
    if (!staffMember) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    if (name) staffMember.name = name;
    if (role) staffMember.role = role;

    await staffMember.save();

    res.json({
      success: true,
      data: staffMember,
    });
  } catch (error) {
    console.error("Error updating staff member:", error);
    res
      .status(500)
      .json({ success: false, message: "Error updating staff member" });
  }
};

export const deleteStaffMember = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.id;
    const { id } = req.params;

    const result = await PartnerStaffModel.deleteOne({ _id: id, partnerId });
    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    res.json({
      success: true,
      message: "Staff member removed successfully",
    });
  } catch (error) {
    console.error("Error deleting staff member:", error);
    res
      .status(500)
      .json({ success: false, message: "Error deleting staff member" });
  }
};
