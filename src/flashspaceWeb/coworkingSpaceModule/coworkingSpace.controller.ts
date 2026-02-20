import { Request, Response } from "express";
import { Types } from "mongoose";
import { CoworkingSpaceModel } from "./coworkingSpace.model";

export const createCoworkingSpace = async (req: Request, res: Response) => {
  try {
    const {
      name,
      address,
      city,
      area,
      price,
      priceYearly,
      originalPrice,
      rating,
      reviews,
      type,
      features,
      availability,
      popular,
      coordinates,
      image,
    } = req.body;

    const createdSpace = await CoworkingSpaceModel.create({
      name,
      address,
      city,
      area,
      price,
      priceYearly,
      originalPrice,
      rating,
      reviews,
      type,
      features,
      availability,
      popular,
      coordinates,
      image,
    });

    if (!createdSpace) {
      return res.status(400).json({
        success: false,
        message: "Issue with database",
        data: {},
        error: "Issue with Database",
      });
    }

    res.status(201).json({
      success: true,
      message: "Coworking space created successfully",
      data: createdSpace,
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

export const getAllCoworkingSpaces = async (req: Request, res: Response) => {
  try {
    const { deleted } = req.query;
    const query: any =
      String(deleted) === "true" ? { isDeleted: true } : { isDeleted: false };
    const allSpaces = await CoworkingSpaceModel.find(query).sort({
      createdAt: -1,
    });

    if (allSpaces.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No coworking spaces found",
        data: [],
        error: {},
      });
    }

    res.status(200).json({
      success: true,
      message: "Coworking spaces retrieved successfully",
      data: allSpaces,
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

export const getCoworkingSpaceById = async (req: Request, res: Response) => {
  try {
    const coworkingSpaceId = req.params.coworkingSpaceId as string;

    if (!Types.ObjectId.isValid(coworkingSpaceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coworking space ID format",
        data: {},
        error: "Invalid ObjectId",
      });
    }

    const space = await CoworkingSpaceModel.findOne({
      _id: coworkingSpaceId,
      isDeleted: false,
    });

    if (!space) {
      return res.status(404).json({
        success: false,
        message: "Coworking space not found",
        data: {},
        error: "Coworking space not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Coworking space retrieved successfully",
      data: space,
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

export const getCoworkingSpacesByCity = async (req: Request, res: Response) => {
  try {
    const city = req.params.city as string;

    const spaces = await CoworkingSpaceModel.find({
      city: new RegExp(`^${city}$`, "i"), // Case-insensitive match
      isDeleted: false,
    }).sort({ popular: -1, rating: -1 });

    if (spaces.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No coworking spaces found in ${city}`,
        data: [],
        error: {},
      });
    }

    res.status(200).json({
      success: true,
      message: `Coworking spaces in ${city} retrieved successfully`,
      data: spaces,
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

export const updateCoworkingSpace = async (req: Request, res: Response) => {
  try {
    const coworkingSpaceId = req.params.coworkingSpaceId as string;
    const {
      name,
      address,
      city,
      area,
      price,
      priceYearly,
      originalPrice,
      rating,
      reviews,
      type,
      features,
      availability,
      popular,
      coordinates,
      image,
    } = req.body;

    if (!Types.ObjectId.isValid(coworkingSpaceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coworking space ID format",
        data: {},
        error: "Invalid ObjectId",
      });
    }

    const updatedSpace = await CoworkingSpaceModel.findOneAndUpdate(
      { _id: coworkingSpaceId, isDeleted: false },
      {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(area && { area }),
        ...(price && { price }),
        ...(priceYearly && { priceYearly }),
        ...(originalPrice && { originalPrice }),
        ...(rating !== undefined && { rating }),
        ...(reviews !== undefined && { reviews }),
        ...(type && { type }),
        ...(features && { features }),
        ...(availability && { availability }),
        ...(popular !== undefined && { popular }),
        ...(coordinates && { coordinates }),
        ...(image && { image }),
      },
      { new: true, runValidators: true },
    );

    if (!updatedSpace) {
      return res.status(404).json({
        success: false,
        message: "Coworking space not found",
        data: {},
        error: "Coworking space not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Coworking space updated successfully",
      data: updatedSpace,
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

export const deleteCoworkingSpace = async (req: Request, res: Response) => {
  try {
    const coworkingSpaceId = req.params.coworkingSpaceId as string;
    const { restore } = req.query;

    if (!Types.ObjectId.isValid(coworkingSpaceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coworking space ID format",
        data: {},
        error: "Invalid ObjectId",
      });
    }

    const isRestoring = String(restore) === "true";

    const updatedSpace = await CoworkingSpaceModel.findOneAndUpdate(
      { _id: coworkingSpaceId },
      {
        isDeleted: !isRestoring,
        isActive: isRestoring,
      },
      { new: true },
    );

    if (!updatedSpace) {
      return res.status(404).json({
        success: false,
        message: "Coworking space not found",
        data: {},
        error: "Coworking space not found",
      });
    }

    res.status(200).json({
      success: true,
      message: isRestoring
        ? "Coworking space restored successfully"
        : "Coworking space deleted successfully",
      data: updatedSpace,
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

// --- Partner Portal APIs ---

export const getPartnerSpaces = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId; // Extracted from AuthMiddleware

    const spaces = await CoworkingSpaceModel.find({
      $or: [{ partner: userId }, { managers: userId }],
      isDeleted: false,
    }).select("name address city type images");

    res.status(200).json({
      success: true,
      message: "Partner spaces retrieved successfully",
      data: spaces,
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
