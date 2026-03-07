import { Request, Response } from "express";
import { PropertyModel } from "./property.model";
import { CoworkingSpaceModel } from "../coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../virtualOfficeModule/virtualOffice.model";
import { MeetingRoomModel } from "../meetingRoomModule/meetingRoom.model";
import { getFileUrl as getMulterFileUrl } from "../userDashboardModule/config/multer.config";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";

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

    // 1. ADDED: Validation to ensure all documents are approved before KYC approval
    if (req.body.kycStatus === "approved") {
      const property = await PropertyModel.findById(propertyId);
      if (!property) {
        return sendError(res, 404, "Property not found");
      }

      const allDocsApproved =
        property.documents &&
        property.documents.length > 0 &&
        property.documents.every((doc) => doc.status === "approved");

      if (!allDocsApproved) {
        return sendError(
          res,
          400,
          "All property documents must be approved before approving property KYC",
        );
      }
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
      return res.status(200).json({
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
      return res.status(200).json({
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
      return res.status(200).json({
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

export const uploadPropertyImage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { propertyId } = req.params;
    const file = req.file;

    if (!file) {
      return sendError(res, 400, "Image file is required");
    }

    const property = await PropertyModel.findOne({
      _id: propertyId,
      partner: userId,
    });
    if (!property) {
      return sendError(res, 404, "Property not found or unauthorized");
    }

    const fileUrl = getMulterFileUrl(file.filename, "property_image");

    if (!property.images) {
      property.images = [];
    }

    property.images.push(fileUrl);
    await property.save();

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: { url: fileUrl },
    });
  } catch (err) {
    sendError(res, 500, "Failed to upload image", err);
  }
};

export const uploadPropertyDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { propertyId } = req.params;
    const { documentType } = req.body;
    const file = req.file;

    if (!documentType || !file) {
      return sendError(res, 400, "Document type and file are required");
    }

    const property = await PropertyModel.findOne({
      _id: propertyId,
      partner: userId,
    });
    if (!property) {
      return sendError(res, 404, "Property not found or unauthorized");
    }

    const fileUrl = getMulterFileUrl(file.filename, documentType);

    // Initialize documents if it doesn't exist
    if (!property.documents) {
      property.documents = [];
    }

    const existingIndex = property.documents.findIndex(
      (d) => d.type === documentType,
    );

    const docEntry: any = {
      type: documentType,
      name: file.originalname,
      fileUrl,
      status: "pending",
      uploadedAt: new Date(),
    };

    if (existingIndex >= 0) {
      // Cleanup old file
      const oldDoc = property.documents[existingIndex];
      if (oldDoc.fileUrl) {
        try {
          const oldFilename = oldDoc.fileUrl.split("/").pop();
          if (oldFilename) {
            const uploadsDir = path.join(
              __dirname,
              "../../../../uploads/kyc-documents",
            );
            const oldFilePath = path.join(uploadsDir, oldFilename);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
            }
          }
        } catch (err) {
          console.error("Failed to delete old property document file:", err);
        }
      }
      property.documents[existingIndex] = docEntry;
    } else {
      property.documents.push(docEntry);
    }

    await property.save();

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      data: docEntry,
    });
  } catch (err) {
    sendError(res, 500, "Failed to upload document", err);
  }
};

export const deletePropertyDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { propertyId } = req.params;
    const { documentType } = req.query;

    if (!documentType) {
      return sendError(res, 400, "Document type is required");
    }

    const property = await PropertyModel.findOne({
      _id: propertyId,
      partner: userId,
    });
    if (!property) {
      return sendError(res, 404, "Property not found or unauthorized");
    }

    const docIndex =
      property.documents?.findIndex((d) => d.type === documentType) ?? -1;
    if (docIndex === -1) {
      return sendError(res, 404, "Document not found");
    }

    const doc = property.documents![docIndex];
    if (doc.fileUrl) {
      try {
        const filename = doc.fileUrl.split("/").pop();
        if (filename) {
          const uploadsDir = path.join(
            __dirname,
            "../../../../uploads/kyc-documents",
          );
          const filePath = path.join(uploadsDir, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (err) {
        console.error("Failed to delete property document file:", err);
      }
    }

    property.documents!.splice(docIndex, 1);
    await property.save();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      data: {},
    });
  } catch (err) {
    sendError(res, 500, "Failed to delete document", err);
  }
};

export const getAvailableCities = async (req: Request, res: Response) => {
  try {
    // Get cities directly from space collections (legacy direct-field pattern)
    // AND from properties linked to active spaces
    const [cwCities, voCities, mrCities, coworkingProps, virtualProps, meetingProps] = await Promise.all([
      CoworkingSpaceModel.distinct("city", { isDeleted: false }),
      VirtualOfficeModel.distinct("city", { isDeleted: false }),
      MeetingRoomModel.distinct("city", { isDeleted: false }),
      CoworkingSpaceModel.distinct("property", { isDeleted: false }),
      VirtualOfficeModel.distinct("property", { isDeleted: false }),
      MeetingRoomModel.distinct("property", { isDeleted: false }),
    ]);

    // Also check properties for cities (for any spaces that use property references)
    const activePropertyIds = [
      ...new Set([
        ...coworkingProps.filter(Boolean).map((id) => id.toString()),
        ...virtualProps.filter(Boolean).map((id) => id.toString()),
        ...meetingProps.filter(Boolean).map((id) => id.toString()),
      ]),
    ];

    let propertyCities: string[] = [];
    if (activePropertyIds.length > 0) {
      propertyCities = await PropertyModel.distinct("city", {
        _id: { $in: activePropertyIds },
      });
    }

    // Merge and deduplicate all city sources
    const allCities = [
      ...new Set([...cwCities, ...voCities, ...mrCities, ...propertyCities]),
    ];

    const filteredCities = allCities
      .filter((city): city is string => typeof city === "string" && city.trim() !== "")
      .sort();

    res.status(200).json({
      success: true,
      message: "Available cities retrieved successfully",
      data: filteredCities,
    });
  } catch (err) {
    console.error("GetAvailableCities Error:", err);
    sendError(res, 500, "Failed to retrieve available cities", err);
  }
};
