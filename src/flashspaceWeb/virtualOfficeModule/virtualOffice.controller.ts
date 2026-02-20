import { Request, Response } from "express";
import { Types } from "mongoose";
import { VirtualOfficeModel } from "./virtualOffice.model";
import {
  createVirtualOfficeSchema,
  updateVirtualOfficeSchema,
} from "./virtualOffice.validation";
import { z } from "zod";
import { UserRole } from "../authModule/models/user.model";

// Create new Virtual Office
export const createVirtualOffice = async (req: Request, res: Response) => {
  try {
    const validatedData = createVirtualOfficeSchema.parse({
      body: req.body,
    });

    const {
      name,
      address,
      city,
      area,
      gstPlanPrice,
      mailingPlanPrice,
      brPlanPrice,
      features,
      availability,
      popular,
      sponsored,
      coordinates,
      images,
    } = validatedData.body;

    // Check if user is a partner
    if (req.user?.role !== UserRole.PARTNER) {
      return res.status(403).json({
        message: "Only partners can create virtual offices",
        success: false,
      });
    }

    const newOffice = new VirtualOfficeModel({
      name,
      address,
      city,
      area,
      gstPlanPrice,
      mailingPlanPrice,
      brPlanPrice,
      images,
      features,
      availability,
      popular,
      sponsored, // Renamed from isSponsored
      coordinates,
      partner: req.user!.id,
      isActive: true, // Default
    });

    await newOffice.save();

    res.status(201).json({
      success: true,
      message: "Virtual office created successfully",
      data: newOffice,
      error: {},
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        data: {},
        error: err.issues,
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong !!",
      data: {},
      error: err,
    });
  }
};

export const getAllVirtualOffices = async (req: Request, res: Response) => {
  try {
    const { deleted } = req.query;
    const query: any =
      String(deleted) === "true" ? { isDeleted: true } : { isDeleted: false };
    const allOffices = await VirtualOfficeModel.find(query).sort({
      createdAt: -1,
    });

    if (allOffices.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No virtual offices found",
        data: [],
        error: {},
      });
    }

    res.status(200).json({
      success: true,
      message: "Virtual offices retrieved successfully",
      data: allOffices,
      error: {},
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Something went wrong !!",
      data: {},
      error: err,
    });
  }
};

export const getVirtualOfficeById = async (req: Request, res: Response) => {
  try {
    const virtualOfficeId = req.params.virtualOfficeId as string;

    if (!Types.ObjectId.isValid(virtualOfficeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid virtual office ID format",
        data: {},
        error: "Invalid ObjectId",
      });
    }

    const office = await VirtualOfficeModel.findOne({
      _id: virtualOfficeId,
      isDeleted: false,
    });

    if (!office) {
      return res.status(404).json({
        success: false,
        message: "Virtual office not found",
        data: {},
        error: "Virtual office not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Virtual office retrieved successfully",
      data: office,
      error: {},
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Something went wrong !!",
      data: {},
      error: err,
    });
  }
};

export const getVirtualOfficesByCity = async (req: Request, res: Response) => {
  try {
    const city = req.params.city as string;

    const offices = await VirtualOfficeModel.find({
      city: new RegExp(`^${city}$`, "i"), // Case-insensitive match
      isDeleted: false,
    }).sort({ popular: -1, avgRating: -1 });

    if (offices.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No virtual offices found in ${city}`,
        data: [],
        error: {},
      });
    }

    res.status(200).json({
      success: true,
      message: `Virtual offices in ${city} retrieved successfully`,
      data: offices,
      error: {},
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Something went wrong !!",
      data: {},
      error: err,
    });
  }
};

// Updates an existing virtual office including new yearly pricing fields
export const updateVirtualOffice = async (req: Request, res: Response) => {
  try {
    const virtualOfficeId = req.params.virtualOfficeId as string;
    const {
      name,
      address,
      city,
      area,
      gstPlanPrice,
      mailingPlanPrice,
      brPlanPrice,
      features,
      availability,
      popular,
      coordinates,
      images,
      isSponsored,
    } = req.body;

    if (!Types.ObjectId.isValid(virtualOfficeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid virtual office ID format",
        data: {},
        error: "Invalid ObjectId",
      });
    }

    const updatedOffice = await VirtualOfficeModel.findOneAndUpdate(
      { _id: virtualOfficeId, isDeleted: false },
      {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(area && { area }),
        ...(gstPlanPrice && { gstPlanPrice }),
        ...(mailingPlanPrice && { mailingPlanPrice }),
        ...(brPlanPrice && { brPlanPrice }),
        ...(features && { features }),
        ...(availability && { availability }),
        ...(popular !== undefined && { popular }),
        ...(coordinates && { coordinates }),
        ...(images && { images }),
        ...(isSponsored !== undefined && { isSponsored }),
      },
      { new: true, runValidators: true },
    );

    if (!updatedOffice) {
      return res.status(404).json({
        success: false,
        message: "Virtual office not found",
        data: {},
        error: "Virtual office not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Virtual office updated successfully",
      data: updatedOffice,
      error: {},
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Something went wrong !!",
      data: {},
      error: err,
    });
  }
};

export const deleteVirtualOffice = async (req: Request, res: Response) => {
  try {
    const virtualOfficeId = req.params.virtualOfficeId as string;
    const { restore } = req.query;

    if (!Types.ObjectId.isValid(virtualOfficeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid virtual office ID format",
        data: {},
        error: "Invalid ObjectId",
      });
    }

    const isRestoring = String(restore) === "true";

    const updatedOffice = await VirtualOfficeModel.findOneAndUpdate(
      { _id: virtualOfficeId },
      {
        isDeleted: !isRestoring,
        isActive: isRestoring,
      },
      { new: true },
    );

    if (!updatedOffice) {
      return res.status(404).json({
        success: false,
        message: "Virtual office not found",
        data: {},
        error: "Virtual office not found",
      });
    }

    res.status(200).json({
      success: true,
      message: isRestoring
        ? "Virtual office restored successfully"
        : "Virtual office deleted successfully",
      data: updatedOffice,
      error: {},
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Something went wrong !!",
      data: {},
      error: err,
    });
  }
};

export const getPartnerVirtualOffices = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const spaces = await VirtualOfficeModel.find({
      partner: userId,
      isDeleted: false,
    }).select("name address city images features");

    const formattedSpaces = spaces.map((space) => {
      const s = space.toObject();
      return {
        ...s,
        type: "Virtual Office",
        images: s.images || [],
      };
    });

    res.status(200).json({
      success: true,
      message: "Partner virtual offices retrieved",
      data: formattedSpaces,
      error: {},
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch partner virtual offices",
      data: {},
      error: err,
    });
  }
};
