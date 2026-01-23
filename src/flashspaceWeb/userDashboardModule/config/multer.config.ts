import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../../../uploads/kyc-documents');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log("[Multer] Destination called for:", file.originalname);
        cb(null, uploadsDir);
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
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    console.log("[Multer] Filtering file:", file.originalname, "Mime:", file.mimetype);

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.log("[Multer] Rejected file type:", file.mimetype);
        cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
    }
};

// Create multer instance
export const uploadKYCFile = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    }
});

// Helper function to get file URL
export const getFileUrl = (filename: string): string => {
    return `/uploads/kyc-documents/${filename}`;
};
