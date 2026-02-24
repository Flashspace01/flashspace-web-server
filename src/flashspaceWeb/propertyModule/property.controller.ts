import { Request, Response } from "express";
import { PropertyModel } from "./property.model";
import { CoworkingSpaceModel } from "../coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../virtualOfficeModule/virtualOffice.model";
import { MeetingRoomModel } from "../meetingRoomModule/meetingRoom.model";

const sendError = (
  res: Response,
  status: number,
  message: string,
  error: any = null,
) => {
  return res.status(status).json({
    success: false,
    message,
    data: {},
    error:
      process.env.NODE_ENV === "development" ? error : "Internal Server Error",
  });
};

export const createProperty = async (req: Request, res: Response) => {
  try {
    console.log("🏨 CreateProperty hit by user:", (req as any).user);
    const partnerId = (req as any).user?.id;
    if (!partnerId) {
      console.log("❌ createProperty: No partner ID found in request");
      return sendError(res, 401, "Unauthorized: No partner found");
    }

    const property = new PropertyModel({
      ...req.body,
      partner: partnerId,
    });

    await property.save();

    res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: property,
    });
  } catch (err) {
    sendError(res, 500, "Failed to create property", err);
  }
};

export const updateProperty = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const partnerId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const query: any = { _id: propertyId };
    if (userRole !== "admin") {
      query.partner = partnerId;
    }

    const updatedProperty = await PropertyModel.findOneAndUpdate(
      query,
      { $set: req.body },
      { new: true, runValidators: true },
    );

    if (!updatedProperty) {
      return sendError(res, 404, "Property not found or unauthorized");
    }

    res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: updatedProperty,
    });
  } catch (err) {
    sendError(res, 500, "Failed to update property", err);
  }
};

export const getPartnerProperties = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user?.id;
    const properties = await PropertyModel.find({ partner: partnerId });

    res.status(200).json({
      success: true,
      message: "Properties retrieved successfully",
      data: properties,
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve properties", err);
  }
};

export const getPropertyById = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const property = await PropertyModel.findById(propertyId);

    if (!property) {
      return sendError(res, 404, "Property not found");
    }

    res.status(200).json({
      success: true,
      message: "Property retrieved successfully",
      data: property,
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve property", err);
  }
};

export const getPropertySpaces = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { type } = req.query;

    if (type === "coworking") {
      const spaces = await CoworkingSpaceModel.find({
        property: propertyId,
        isDeleted: false,
      });
      return res
        .status(200)
        .json({
          success: true,
          message: "Coworking spaces retrieved",
          data: spaces,
        });
    }
    if (type === "virtual") {
      const spaces = await VirtualOfficeModel.find({
        property: propertyId,
        isDeleted: false,
      });
      return res
        .status(200)
        .json({
          success: true,
          message: "Virtual offices retrieved",
          data: spaces,
        });
    }
    if (type === "meeting") {
      const spaces = await MeetingRoomModel.find({
        property: propertyId,
        isDeleted: false,
      });
      return res
        .status(200)
        .json({
          success: true,
          message: "Meeting rooms retrieved",
          data: spaces,
        });
    }

    const [coworkingSpaces, virtualOffices, meetingRooms] = await Promise.all([
      CoworkingSpaceModel.find({ property: propertyId, isDeleted: false }),
      VirtualOfficeModel.find({ property: propertyId, isDeleted: false }),
      MeetingRoomModel.find({ property: propertyId, isDeleted: false }),
    ]);

    res.status(200).json({
      success: true,
      message: "Property spaces retrieved successfully",
      data: {
        coworkingSpaces,
        virtualOffices,
        meetingRooms,
      },
    });
  } catch (err) {
    sendError(res, 500, "Failed to retrieve property spaces", err);
  }
};

export const deleteProperty = async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const partnerId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const query: any = { _id: propertyId };
    if (userRole !== "admin") {
      query.partner = partnerId;
    }

    const property = await PropertyModel.findOneAndDelete(query);
    if (!property) {
      return sendError(res, 404, "Property not found or unauthorized");
    }

    res.status(200).json({
      success: true,
      message: "Property deleted successfully",
      data: {},
    });
  } catch (err) {
    sendError(res, 500, "Failed to delete property", err);
  }
};
