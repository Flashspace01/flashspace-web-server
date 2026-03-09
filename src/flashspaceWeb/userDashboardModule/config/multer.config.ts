import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directories if they don't exist
const kycDocsDir = path.join(__dirname, '../../../../uploads/kyc-documents');
const videoKycDir = path.join(__dirname, '../../../../uploads/video-kyc');

[kycDocsDir, videoKycDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const docType = req.body.documentType;
        const targetDir = docType === 'video_kyc' ? videoKycDir : kycDocsDir;
        console.log(`[Multer] Uploading ${docType} to: ${targetDir}`);
        cb(null, targetDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: userId_timestamp_originalname
        const userId = (req as any).user?.id || 'unknown';
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${userId}_${timestamp}_${sanitizedName}`;
        console.log("[Multer] Generated filename:", filename);
        cb(null, filename);
    }
});

// File filter - only allow PDF, JPG, PNG
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-matroska',
        'video/avi',
        'video/mpeg'
    ];

    console.log(`[Multer Filter] Incoming file: ${file.originalname}, MIME: ${file.mimetype}`);

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.log("[Multer Filter] Rejected file type:", file.mimetype);
        cb(new Error(`Invalid file type (${file.mimetype}). Only PDF, JPG, PNG, and Video (MP4, WEBM, MOV) are allowed.`));
    }
};

// Create multer instance
export const uploadKYCFile = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size for videos
    }
});

// Helper function to get file URL
export const getFileUrl = (filename: string, docType?: string): string => {
    const base = docType === 'video_kyc' ? '/uploads/video-kyc' : '/uploads/kyc-documents';
    return `${base}/${filename}`;
};
