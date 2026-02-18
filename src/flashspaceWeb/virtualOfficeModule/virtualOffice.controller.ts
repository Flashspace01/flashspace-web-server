import { Request, Response } from "express";
import { Types } from "mongoose";
import { VirtualOfficeModel } from "./virtualOffice.model";

export const createVirtualOffice = async (req: Request, res: Response) => {
  try {
    const {
      name,
      address,
      city,
      area,
      price,
      priceYearly,
      originalPrice,
      gstPlanPrice,
      gstPlanPriceYearly,
      mailingPlanPrice,
      mailingPlanPriceYearly,
      brPlanPrice,
      brPlanPriceYearly,
      rating,
      reviews,
      features,
      availability,
      popular,
      coordinates,
      image,
    } = req.body;

    const createdOffice = await VirtualOfficeModel.create({
      name,
      address,
      city,
      area,
      price,
      priceYearly,
      originalPrice,
      gstPlanPrice,
      gstPlanPriceYearly,
      mailingPlanPrice,
      mailingPlanPriceYearly,
      brPlanPrice,
      brPlanPriceYearly,
      rating,
      reviews,
      features,
      availability,
      popular,
      coordinates,
      image,
    });

    if (!createdOffice) {
      return res.status(400).json({
        success: false,
        message: "Issue with database",
        data: {},
        error: "Issue with Database",
      });
    }

    res.status(201).json({
      success: true,
      message: "Virtual office created successfully",
      data: createdOffice,
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
    }).sort({ popular: -1, rating: -1 });

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
      price,
      priceYearly,
      originalPrice,
      gstPlanPrice,
      gstPlanPriceYearly,
      mailingPlanPrice,
      mailingPlanPriceYearly,
      brPlanPrice,
      brPlanPriceYearly,
      rating,
      reviews,
      features,
      availability,
      popular,
      coordinates,
      image,
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
        ...(price && { price }),
        ...(priceYearly && { priceYearly }),
        ...(originalPrice && { originalPrice }),
        ...(gstPlanPrice && { gstPlanPrice }),
        ...(gstPlanPriceYearly && { gstPlanPriceYearly }),
        ...(mailingPlanPrice && { mailingPlanPrice }),
        ...(mailingPlanPriceYearly && { mailingPlanPriceYearly }),
        ...(brPlanPrice && { brPlanPrice }),
        ...(brPlanPriceYearly && { brPlanPriceYearly }),
        ...(rating !== undefined && { rating }),
        ...(reviews !== undefined && { reviews }),
        ...(features && { features }),
        ...(availability && { availability }),
        ...(popular !== undefined && { popular }),
        ...(coordinates && { coordinates }),
        ...(image && { image }),
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
    const userId = (req as any).user.userId;

    const spaces = await VirtualOfficeModel.find({
      $or: [{ partner: userId }, { managers: userId }],
      isDeleted: false,
    }).select("name address city image features");

    const formattedSpaces = spaces.map((space) => {
      const s = space.toObject();
      return {
        ...s,
        type: "Virtual Office",
        images: s.image ? [s.image] : [], // Backend has 'image' string, frontend expects 'images' array
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
