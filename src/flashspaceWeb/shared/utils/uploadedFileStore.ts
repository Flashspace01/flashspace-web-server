import { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const BUCKET_NAME = "uploadedFiles";
const uploadsRoot = path.resolve(__dirname, "../../../../uploads");
const CONTENT_TYPES_BY_EXTENSION: Record<string, string> = {
  ".avi": "video/x-msvideo",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

type UploadMetadata = {
  path: string;
  originalName?: string;
  contentType?: string;
  source?: string;
  backedUpAt?: Date;
};

const getBucket = () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection is not ready for uploaded file storage");
  }

  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
};

const getContentTypeFromPath = (filePath: string): string | undefined => {
  const extension = path.extname(filePath).toLowerCase();
  return CONTENT_TYPES_BY_EXTENSION[extension];
};

export const normalizeUploadPath = (value?: string | null): string | null => {
  if (!value) return null;

  let candidate = value.trim().replace(/\\/g, "/");
  if (!candidate) return null;

  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    try {
      candidate = new URL(candidate).pathname;
    } catch {
      return null;
    }
  }

  candidate = candidate.split("?")[0].split("#")[0];
  if (!candidate.startsWith("/")) {
    candidate = `/${candidate}`;
  }

  if (candidate.startsWith("/api/uploads/")) {
    candidate = candidate.replace(/^\/api\/uploads\//, "/uploads/");
  }

  if (!candidate.startsWith("/uploads/")) return null;

  try {
    return decodeURIComponent(candidate);
  } catch {
    return candidate;
  }
};

const getLocalUploadPath = (uploadPath: string): string | null => {
  const normalized = normalizeUploadPath(uploadPath);
  if (!normalized) return null;

  const relativePath = normalized.replace(/^\/uploads\/?/, "");
  if (!relativePath || relativePath.includes("\0")) return null;

  const resolvedPath = path.resolve(uploadsRoot, relativePath);
  const rootWithSeparator = `${uploadsRoot}${path.sep}`;
  if (resolvedPath !== uploadsRoot && resolvedPath.startsWith(rootWithSeparator)) {
    return resolvedPath;
  }

  return null;
};

const findBackedUpFile = async (uploadPath: string) => {
  const bucket = getBucket();
  const files = await bucket
    .find({ "metadata.path": uploadPath })
    .sort({ uploadDate: -1 })
    .limit(1)
    .toArray();

  return files[0] || null;
};

export const backupUploadedFile = async (
  uploadPathOrUrl: string,
  localFilePath: string,
  metadata: Omit<UploadMetadata, "path" | "backedUpAt"> = {},
): Promise<void> => {
  const uploadPath = normalizeUploadPath(uploadPathOrUrl);
  if (!uploadPath) return;

  const stat = await fs.promises.stat(localFilePath).catch(() => null);
  if (!stat?.isFile()) {
    throw new Error(`Uploaded file not found on disk: ${localFilePath}`);
  }

  const bucket = getBucket();
  const existingFiles = await bucket
    .find({ "metadata.path": uploadPath })
    .toArray();

  await Promise.all(
    existingFiles.map((file: any) =>
      bucket.delete(file._id).catch((error: unknown) => {
        console.error("[UploadedFileStore] Failed to delete old backup:", error);
      }),
    ),
  );

  await new Promise<void>((resolve, reject) => {
    const readStream = fs.createReadStream(localFilePath);
    const uploadStream = bucket.openUploadStream(path.posix.basename(uploadPath), {
      contentType: metadata.contentType,
      metadata: {
        ...metadata,
        path: uploadPath,
        backedUpAt: new Date(),
      },
    });

    readStream.on("error", reject);
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve());
    readStream.pipe(uploadStream);
  });
};

export const ensureUploadedFileBackup = (
  uploadPathOrUrl: string,
  localFilePath: string,
  metadata: Omit<UploadMetadata, "path" | "backedUpAt"> = {},
): void => {
  const uploadPath = normalizeUploadPath(uploadPathOrUrl);
  if (!uploadPath) return;

  findBackedUpFile(uploadPath)
    .then((file) => {
      if (!file) {
        return backupUploadedFile(uploadPath, localFilePath, metadata);
      }
      return undefined;
    })
    .catch((error: unknown) => {
      console.error("[UploadedFileStore] Lazy backup failed:", error);
    });
};

const walkUploadsDirectory = async (dir: string): Promise<string[]> => {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkUploadsDirectory(entryPath);
      if (entry.isFile()) return [entryPath];
      return [];
    }),
  );

  return files.flat();
};

export const backfillLocalUploadsToGridFs = async (): Promise<{
  scanned: number;
  backedUp: number;
  skipped: number;
  failed: number;
}> => {
  const rootStat = await fs.promises.stat(uploadsRoot).catch(() => null);
  if (!rootStat?.isDirectory()) {
    return { scanned: 0, backedUp: 0, skipped: 0, failed: 0 };
  }

  const files = await walkUploadsDirectory(uploadsRoot);
  const result = { scanned: files.length, backedUp: 0, skipped: 0, failed: 0 };

  for (const filePath of files) {
    const relativePath = path.relative(uploadsRoot, filePath).split(path.sep).join("/");
    const uploadPath = `/uploads/${relativePath}`;

    try {
      const existing = await findBackedUpFile(uploadPath);
      if (existing) {
        result.skipped += 1;
        continue;
      }

      await backupUploadedFile(uploadPath, filePath, {
        contentType: getContentTypeFromPath(filePath),
        originalName: path.basename(filePath),
        source: "startup-backfill",
      });
      result.backedUp += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`[UploadedFileStore] Backfill failed for ${uploadPath}:`, error);
    }
  }

  return result;
};

export const deleteUploadedFileBackup = async (
  uploadPathOrUrl?: string | null,
): Promise<void> => {
  const uploadPath = normalizeUploadPath(uploadPathOrUrl);
  if (!uploadPath) return;

  const bucket = getBucket();
  const files = await bucket
    .find({ "metadata.path": uploadPath })
    .toArray();

  await Promise.all(
    files.map((file: any) =>
      bucket.delete(file._id).catch((error: unknown) => {
        console.error("[UploadedFileStore] Failed to delete backup:", error);
      }),
    ),
  );
};

const setGridFsHeaders = (res: Response, file: any, statusCode = 200) => {
  const contentType =
    file.contentType ||
    file.metadata?.contentType ||
    getContentTypeFromPath(file.metadata?.originalName || file.filename || "") ||
    "application/octet-stream";
  const originalName = file.metadata?.originalName || file.filename;

  res.status(statusCode);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, max-age=3600");
  if (file.length !== undefined) {
    res.setHeader("Content-Length", String(file.length));
  }
  if (originalName) {
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`,
    );
  }
};

const streamGridFsFile = (req: Request, res: Response, next: NextFunction, file: any) => {
  const bucket = getBucket();
  const range = req.headers.range;
  const fileLength = Number(file.length || 0);

  if (range && fileLength > 0) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.status(416).setHeader("Content-Range", `bytes */${fileLength}`);
      return res.end();
    }

    const requestedStart = match[1] ? Number(match[1]) : 0;
    const requestedEnd = match[2] ? Number(match[2]) : fileLength - 1;
    const start = Number.isFinite(requestedStart) ? requestedStart : 0;
    const end = Math.min(
      Number.isFinite(requestedEnd) ? requestedEnd : fileLength - 1,
      fileLength - 1,
    );

    if (start >= fileLength || start > end) {
      res.status(416).setHeader("Content-Range", `bytes */${fileLength}`);
      return res.end();
    }

    setGridFsHeaders(res, file, 206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileLength}`);
    res.setHeader("Content-Length", String(end - start + 1));

    if (req.method === "HEAD") return res.end();

    return bucket
      .openDownloadStream(file._id, { start, end: end + 1 })
      .on("error", next)
      .pipe(res);
  }

  setGridFsHeaders(res, file);
  if (req.method === "HEAD") return res.end();

  return bucket.openDownloadStream(file._id).on("error", next).pipe(res);
};

export const serveUploadedFile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return next();
  }

  const uploadPath = normalizeUploadPath(`${req.baseUrl || ""}${req.path || ""}`);
  if (!uploadPath) return next();

  const localFilePath = getLocalUploadPath(uploadPath);
  if (localFilePath) {
    const stat = await fs.promises.stat(localFilePath).catch(() => null);
    if (stat?.isFile()) {
      ensureUploadedFileBackup(uploadPath, localFilePath, {
        contentType: getContentTypeFromPath(localFilePath),
        originalName: path.basename(localFilePath),
        source: "lazy-serve",
      });

      res.setHeader("Cache-Control", "private, max-age=3600");
      return res.sendFile(localFilePath);
    }
  }

  try {
    const file = await findBackedUpFile(uploadPath);
    if (!file) return next();

    return streamGridFsFile(req, res, next, file);
  } catch (error) {
    console.error("[UploadedFileStore] Failed to serve upload:", error);
    return next(error);
  }
};
