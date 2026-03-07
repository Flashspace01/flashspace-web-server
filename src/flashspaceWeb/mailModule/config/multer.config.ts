import multer from "multer";
import path from "path";
import fs from "fs";

const mailDocsDir = path.join(__dirname, "../../../../uploads/mail-documents");

if (!fs.existsSync(mailDocsDir)) {
  fs.mkdirSync(mailDocsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, mailDocsDir),
  filename: (req, file, cb) => {
    const userId = (req as any).user?.id || "unknown";
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${userId}_${timestamp}_${sanitizedName}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(
    new Error(
      `Invalid file type (${file.mimetype}). Only JPG, PNG, WEBP, and PDF are allowed.`,
    ),
  );
};

export const uploadMailDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const getMailDocumentUrl = (filename: string): string => {
  return `/uploads/mail-documents/${filename}`;
};
