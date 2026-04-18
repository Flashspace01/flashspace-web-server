import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create profile-pictures directory if it doesn't exist
const profilePicsDir = path.join(__dirname, '../../../../uploads/profile-pictures');

if (!fs.existsSync(profilePicsDir)) {
    fs.mkdirSync(profilePicsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profilePicsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: userId_timestamp_originalname
        const userId = (req as any).user?.id || 'unknown';
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${userId}_${timestamp}_${sanitizedName}`;
        cb(null, filename);
    }
});

// File filter - only allow images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG and WEBP are allowed.'));
    }
};

// Create multer instance
export const uploadProfilePic = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    }
});
