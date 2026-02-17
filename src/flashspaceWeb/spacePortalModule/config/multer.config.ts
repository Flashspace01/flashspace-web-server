import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const spacePhotosDir = path.join(__dirname, '../../../../uploads/space-photos');

if (!fs.existsSync(spacePhotosDir)) {
    fs.mkdirSync(spacePhotosDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log(`[Multer] Uploading space photo to: ${spacePhotosDir}`);
        cb(null, spacePhotosDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: spaceId_timestamp_originalname
        const spaceId = req.params.spaceId || 'unknown';
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${spaceId}_${timestamp}_${sanitizedName}`;
        console.log("[Multer] Generated filename:", filename);
        cb(null, filename);
    }
});

// File filter - only allow JPG, PNG, WEBP
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
    ];

    console.log(`[Multer Filter] Incoming file: ${file.originalname}, MIME: ${file.mimetype}`);

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.log("[Multer Filter] Rejected file type:", file.mimetype);
        cb(new Error(`Invalid file type (${file.mimetype}). Only JPG, PNG, and WEBP are allowed.`));
    }
};

// Create multer instance
export const uploadSpacePhoto = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    }
});

// Helper function to get file URL
export const getSpacePhotoUrl = (filename: string): string => {
    return `/uploads/space-photos/${filename}`;
};
