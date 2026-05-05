import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory for ticket attachments if it doesn't exist
const serverRoot = path.join(__dirname, '../../../../');
const ticketAttachmentsDir = path.resolve(serverRoot, 'uploads/ticket-attachments');

if (!fs.existsSync(ticketAttachmentsDir)) {
    fs.mkdirSync(ticketAttachmentsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, ticketAttachmentsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: userId_timestamp_originalname
        const userId = (req as any).user?.id || 'unknown';
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `ticket_${userId}_${timestamp}_${sanitizedName}`;
        cb(null, filename);
    }
});

// File filter - allow images and PDFs
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf',
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type (${file.mimetype}). Only PDF, JPG, and PNG are allowed.`));
    }
};

// Create multer instance
export const uploadTicketAttachment = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    }
});
