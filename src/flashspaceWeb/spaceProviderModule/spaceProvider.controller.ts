import { Request, Response } from "express";
import { Types } from "mongoose";
import { SpaceProviderModel } from "./spaceProvider.model";
export const createSpaceProvider = async (req: Request, res: Response) => {
    try {
        let {
            spaceName,
            spaceType,
            city,
            capacity,
            fullAddress,
            pricePerMonth,
            amenities,
            description,
            fullName,
            email,
            phone
        } = req.body;
        const createdSpace = await SpaceProviderModel.create({
            spaceName,
            spaceType,
            city,
            capacity,
            fullAddress,
            pricePerMonth,
            amenities,
            description,
            fullName,
            email,
            phone
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
            message: "Space created successfully",
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
}

export const getAllSpaceProvider = async (req: Request, res: Response) => {
    try {
        let query: any = { isDeleted: false };
        const allSpaceProviders = await SpaceProviderModel.find(query).sort({ createdAt: -1 });
        if (allSpaceProviders.length === 0) {
            return res.status(500).json({
                success: false,
                message: "Can't retrieve data !!",
                data: {},
                error: "Can't retrieve data",
            });
        }
        res.status(201).json({
            success: true,
            message: "Space retrieved successfully",
            data: allSpaceProviders,
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
}

export const getSpaceProviderById= async (req: Request, res: Response) => {
    try {
        const { spaceProviderId } = req.params;

        if (!Types.ObjectId.isValid(spaceProviderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid spaceProvider ID format",
                data: {},
                error: "Invalid ObjectId",
            });
        }

        const spaceProvider = await SpaceProviderModel.findOne({
            _id: spaceProviderId,
            isDeleted: false
        });

        if (!spaceProvider) {
            return res.status(404).json({
                success: false,
                message: "Space not found",
                data: {},
                error: "Space not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Space retrieved successfully",
            data: spaceProvider,
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
}

export const updateSpaceProvider = async (req: Request, res: Response) => {
    try {
        const { spaceProviderId } = req.params;
        const {
            spaceName,
            spaceType,
            city,
            capacity,
            fullAddress,
            pricePerMonth,
            amenities,
            description,
            fullName,
            email,
            phone
        } = req.body;

        if (!Types.ObjectId.isValid(spaceProviderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID format",
                data: {},
                error: "Invalid ObjectId",
            });
        }

        const updatedSpace = await SpaceProviderModel.findOneAndUpdate(
            { _id: spaceProviderId, isDeleted: false },
            {
                ...(spaceName && { spaceName }),
                ...(spaceType && { spaceType }),
                ...(city && { city }),
                ...(capacity && { capacity }),
                ...(fullAddress && { fullAddress }),
                ...(pricePerMonth && { pricePerMonth }),
                ...(amenities && { amenities }),
                ...(description && { description }),
                ...(fullName && { fullName }),
                ...(email && { email }),
                ...(phone && { phone })
            },
            { new: true, runValidators: true }
        );

        if (!updatedSpace) {
            return res.status(404).json({
                success: false,
                message: "Space not found",
                data: {},
                error: "Space not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Space updated successfully",
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
}

export const deleteSpaceProvider = async (req: Request, res: Response) => {
    try {
        const { spaceProviderId } = req.params;

        if (!Types.ObjectId.isValid(spaceProviderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID format",
                data: {},
                error: "Invalid ObjectId",
            });
        }

        const deletedSpace = await SpaceProviderModel.findOneAndUpdate(
            { _id: spaceProviderId, isDeleted: false },
            {
                isDeleted: true,
                isActive: false
            },
            { new: true }
        );

        if (!deletedSpace) {
            return res.status(404).json({
                success: false,
                message: "Space not found",
                data: {},
                error: "Space not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Space deleted successfully",
            data: deletedSpace,
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
}