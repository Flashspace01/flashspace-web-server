// Accept space details
export const acceptSpaceDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const spaceDetails = await SpaceDetails.findById(id);
    if (!spaceDetails) {
      return res.status(404).json({ message: "Space details not found." });
    }
    spaceDetails.overallStatus = "approved";
    await spaceDetails.save();
    return res.status(200).json({ message: "Space details accepted.", data: spaceDetails });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to accept space details." });
  }
};

// Reject space details
export const rejectSpaceDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectReason } = req.body;
    const spaceDetails = await SpaceDetails.findById(id);
    if (!spaceDetails) {
      return res.status(404).json({ message: "Space details not found." });
    }
    spaceDetails.overallStatus = "rejected";
    spaceDetails.rejectReason = rejectReason || "";
    await spaceDetails.save();
    return res.status(200).json({ message: "Space details rejected.", data: spaceDetails });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to reject space details." });
  }
};
// Get all space details
export const getAllSpaceDetails = async (req: Request, res: Response) => {
  try {
    const spaces = await SpaceDetails.find();
    return res.status(200).json({ success: true, data: spaces });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch space details.' });
  }
};
import { Request, Response } from 'express';
import SpaceDetails from '../models/spaceDetails.model';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Multer setup for file uploads
const uploadDir = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')),
});
export const upload = multer({ storage });

// File upload endpoint (to be used in your router)
export const uploadDocument = async (req: Request, res: Response) => {
  // Expects a single file upload with field name 'file'
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const { originalname, mimetype, filename } = req.file;
  const filePath = '/uploads/' + filename;
  return res.status(201).json({
    name: originalname,
    mimetype,
    path: filePath,
    status: 'uploaded',
  });
};

// Create or update space details
export const setSpaceDetails = async (req: Request, res: Response) => {
  try {
    const {
      userKyc,
      spaceName,
      ownerOfPremisesName,
      overallStatus,
      sampleAgreement,
      propertyTaxReceipt,
      aadhaarDocument,
      panDocument
    } = req.body;

    if (!userKyc || !spaceName || !ownerOfPremisesName || !sampleAgreement || !propertyTaxReceipt || !aadhaarDocument || !panDocument) {
      return res.status(400).json({ message: 'All fields (including userKyc, documents) are required.' });
    }

    // Optionally, add more validation for document fields (name, mimetype, path)
    const requiredDocFields = ['name', 'mimetype', 'path'];
    const docs = [sampleAgreement, propertyTaxReceipt, aadhaarDocument, panDocument];
    for (const doc of docs) {
      for (const field of requiredDocFields) {
        if (!doc[field]) {
          return res.status(400).json({ message: `Document field '${field}' is required for all documents.` });
        }
      }
    }

    const spaceDetails = new SpaceDetails({
      userKyc,
      spaceName,
      ownerOfPremisesName,
      overallStatus,
      sampleAgreement,
      propertyTaxReceipt,
      aadhaarDocument,
      panDocument
    });
    await spaceDetails.save();
    return res.status(201).json({ message: 'Space details saved successfully.', data: spaceDetails });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to save space details.' });
  }
};
