import { Request, Response } from "express";
import { PartnerInvoiceModel } from "./partnerInvoice.model";
import { UserModel, UserRole } from "../authModule/models/user.model";
import path from "path";
import fs from "fs/promises";
import { getIO } from "../../socket";
import { backupUploadedFile } from "../shared/utils/uploadedFileStore";
import { createWorker } from "tesseract.js";

const INVOICE_UPLOADS_DIR = path.join(__dirname, "../../../uploads/invoices");
const TESSERACT_CACHE_DIR = path.join(process.cwd(), ".tesseract-cache");

let paymentOcrWorkerPromise: ReturnType<typeof createWorker> | null = null;
let paymentOcrQueue: Promise<void> = Promise.resolve();

const getPaymentOcrWorker = () => {
  if (!paymentOcrWorkerPromise) {
    paymentOcrWorkerPromise = createWorker("eng", undefined, {
      cachePath: TESSERACT_CACHE_DIR,
    }).catch((error) => {
      paymentOcrWorkerPromise = null;
      throw error;
    });
  }

  return paymentOcrWorkerPromise;
};

const recognizePaymentProof = (filePath: string) => {
  const run = async () => {
    const worker = await getPaymentOcrWorker();
    return worker.recognize(filePath);
  };

  const task = paymentOcrQueue.then(run, run);
  paymentOcrQueue = task.then(
    () => undefined,
    () => undefined,
  );

  return task;
};

const normalizeInvoiceStatus = (status?: string) =>
  String(status || "").toUpperCase() === "PAID" ? "Paid" : "Pending";

const normalizeFetchMode = (mode?: string) =>
  String(mode || "").toUpperCase() === "AUTO" ? "AUTO" : "MANUAL";

export const extractUtrFromText = (rawText = "") => {
  const text = rawText.replace(/\s+/g, " ").trim();
  const keywordPatterns = [
    /\bUTR\b\s*(?:No\.?|Number|ID)?\s*[:#.-]?\s*([A-Z0-9][A-Z0-9\s-]{7,40})/i,
    /\b(?:Ref|Reference)\.?\s*(?:No\.?|Number|ID)?\s*[:#.-]?\s*([A-Z0-9][A-Z0-9\s-]{7,40})/i,
    /\bTransaction\s*(?:ID|No\.?|Number)?\s*[:#.-]?\s*([A-Z0-9][A-Z0-9\s-]{7,40})/i,
    /\bTxn\.?\s*(?:ID|No\.?|Number)?\s*[:#.-]?\s*([A-Z0-9][A-Z0-9\s-]{7,40})/i,
    /\bBank\s*(?:Ref|Reference)\.?\s*(?:No\.?|Number|ID)?\s*[:#.-]?\s*([A-Z0-9][A-Z0-9\s-]{7,40})/i,
    /\bRRN\b\s*[:#.-]?\s*([A-Z0-9][A-Z0-9\s-]{7,40})/i,
  ];

  const cleanCandidate = (candidate?: string) => {
    const cleaned = candidate?.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (!cleaned || cleaned.length < 8 || cleaned.length > 30) return "";
    if (!/\d/.test(cleaned)) return "";
    return cleaned;
  };

  for (const pattern of keywordPatterns) {
    const candidate = cleanCandidate(text.match(pattern)?.[1]);
    if (candidate) return candidate;
  }

  const refLine = text
    .split(/[|\n\r\u2022]+/)
    .find((part) => /\b(ref|reference|utr|transaction|txn|rrn)\b/i.test(part));
  const refLineCandidate = cleanCandidate(
    refLine?.match(/[A-Z0-9][A-Z0-9\s-]{7,40}/i)?.[0],
  );
  if (refLineCandidate) return refLineCandidate;

  const fallbackCandidates = text
    .toUpperCase()
    .match(/[A-Z0-9]{8,30}/g)
    ?.filter((candidate) => /\d/.test(candidate)) || [];

  return fallbackCandidates[0] || "";
};

// Upload a new invoice (Partner)
export const uploadInvoice = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    console.log("[uploadInvoice] user:", user);
    console.log("[uploadInvoice] body:", req.body);
    console.log("[uploadInvoice] file:", req.file);

    if (!user || (user.role !== UserRole.PARTNER && user.role !== UserRole.ADMIN)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { invoiceNumber, date, amount } = req.body;

    if (!invoiceNumber || !date || !amount) {
      return res.status(400).json({ success: false, message: "Missing required fields", received: { invoiceNumber, date, amount } });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Invoice file is required" });
    }

    const fileUrl = `/uploads/invoices/${req.file.filename}`;
    const localFilePath = path.join(INVOICE_UPLOADS_DIR, req.file.filename);

    await backupUploadedFile(fileUrl, localFilePath, {
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
      source: "partner-invoice",
    });

    const newInvoice = new PartnerInvoiceModel({
      partnerId: user.id,
      invoiceNumber,
      date: new Date(date),
      amount: Number(amount),
      fileUrl,
      status: "Pending"
    });

    await newInvoice.save();

    return res.status(201).json({
      success: true,
      message: "Invoice uploaded successfully",
      invoice: newInvoice
    });

  } catch (error: any) {
    console.error("Error uploading invoice:", error?.message, error?.stack);
    return res.status(500).json({ success: false, message: "Failed to upload invoice", error: error?.message });
  }
};

// Get partner-specific invoices
export const getPartnerInvoices = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const invoices = await PartnerInvoiceModel.find({ partnerId: user.id })
      .sort({ createdAt: -1 });

    const totalInvoices = invoices.length;
    let totalPaid = 0;
    let totalPending = 0;

    invoices.forEach(inv => {
      if (normalizeInvoiceStatus(inv.status) === "Paid") totalPaid += inv.amount;
      if (normalizeInvoiceStatus(inv.status) === "Pending") totalPending += inv.amount;
    });

    const totalAmount = totalPaid + totalPending;

    return res.status(200).json({
      success: true,
      data: {
        invoices,
        stats: {
          totalAmount,
          totalPaid,
          totalPending,
          countPaid: invoices.filter(i => normalizeInvoiceStatus(i.status) === "Paid").length,
          countPending: invoices.filter(i => normalizeInvoiceStatus(i.status) === "Pending").length,
          totalCount: totalInvoices
        }
      }
    });

  } catch (error: any) {
    console.error("Error fetching partner invoices:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch invoices" });
  }
};

// Get all invoices (Admin)
export const getAllInvoicesAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { partnerId, status } = req.query;

    let filter: any = {};
    if (partnerId) filter.partnerId = partnerId;
    if (status) {
      const normalizedStatus = normalizeInvoiceStatus(String(status));
      filter.status = {
        $in: [normalizedStatus, normalizedStatus.toUpperCase()],
      };
    }

    const invoices = await PartnerInvoiceModel.find(filter)
      .populate("partnerId", "fullName email phoneNumber")
      .sort({ createdAt: -1 });

    // Calculate stats
    let totalPaid = 0;
    let totalPending = 0;
    let countPaid = 0;
    let countPending = 0;

    invoices.forEach((inv: any) => {
      if (normalizeInvoiceStatus(inv.status) === "Paid") {
        totalPaid += inv.amount;
        countPaid++;
      } else {
        totalPending += inv.amount;
        countPending++;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        invoices,
        stats: {
          totalAmount: totalPaid + totalPending,
          totalPaid,
          totalPending,
          countPaid,
          countPending,
          totalCount: invoices.length
        }
      }
    });

  } catch (error: any) {
    console.error("Error fetching admin invoices:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch invoices" });
  }
};

// OCR uploaded payment proof and attempt to extract UTR (Admin)
export const extractPaymentUtr = async (req: Request, res: Response): Promise<any> => {
  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Payment proof file is required",
      });
    }

    if (!file.mimetype.startsWith("image/")) {
      return res.status(200).json({
        success: true,
        data: {
          utrNumber: "",
          fetchMode: "MANUAL",
          extractedText: "",
        },
        message: "Auto UTR extraction currently supports image proofs. Please enter UTR manually.",
      });
    }

    const result = await recognizePaymentProof(file.path);
    const extractedText = result.data?.text || "";
    const utrNumber = extractUtrFromText(extractedText);

    return res.status(200).json({
      success: true,
      data: {
        utrNumber,
        fetchMode: utrNumber ? "AUTO" : "MANUAL",
        extractedText,
      },
      message: utrNumber
        ? "UTR extracted successfully"
        : "UTR not found. Please enter it manually.",
    });
  } catch (error: any) {
    console.error("Error extracting UTR:", error?.message, error?.stack);
    return res.status(200).json({
      success: true,
      data: {
        utrNumber: "",
        fetchMode: "MANUAL",
        extractedText: "",
      },
      message: "Could not auto extract UTR. Please enter it manually.",
    });
  } finally {
    if (file?.path) {
      fs.unlink(file.path).catch(() => undefined);
    }
  }
};

// Mark invoice as paid (Admin)
export const markInvoicePaid = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const {
      adminNote,
      paymentMethod,
      amountPaid,
      paymentDate,
      utrNumber,
      fetchMode,
    } = req.body || {};

    const missingFields = [
      ["paymentMethod", paymentMethod],
      ["amountPaid", amountPaid],
      ["paymentDate", paymentDate],
      ["utrNumber", utrNumber],
      ["paymentProof", req.file],
    ]
      .filter(([, value]) => !value)
      .map(([field]) => field);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required payment fields: ${missingFields.join(", ")}`,
      });
    }

    const parsedAmount = Number(amountPaid);
    const parsedDate = new Date(paymentDate);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "amountPaid must be a valid positive number",
      });
    }

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "paymentDate must be a valid date",
      });
    }

    console.log("[markInvoicePaid] Marking invoice as paid:", id);

    const paymentProof = `/uploads/invoices/${req.file!.filename}`;
    const localFilePath = path.join(INVOICE_UPLOADS_DIR, req.file!.filename);

    await backupUploadedFile(paymentProof, localFilePath, {
      originalName: req.file!.originalname,
      contentType: req.file!.mimetype,
      source: "partner-invoice-payment-proof",
    });

    const updateData: any = {
      status: "Paid",
      paymentDetails: {
        paymentMethod,
        amountPaid: parsedAmount,
        paymentDate: parsedDate,
        utrNumber: String(utrNumber).trim().toUpperCase(),
        paymentProof,
        fetchMode: normalizeFetchMode(fetchMode),
        markedPaidBy: user?.id,
        markedPaidAt: new Date(),
      },
    };

    if (adminNote) {
      updateData.adminNote = adminNote;
    }

    const invoice = await PartnerInvoiceModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    console.log("[markInvoicePaid] Invoice updated successfully:", invoice._id);

    // Emit socket event to notify partner
    try {
      const io = getIO();
      io.to(invoice.partnerId.toString()).emit("notification:new", {
        title: "Invoice Paid",
        message: `Your invoice #${invoice.invoiceNumber} has been marked as paid!`,
        type: "SUCCESS",
        timestamp: new Date()
      });
    } catch (socketErr) {
      console.log("Socket emit failed, continuing...", socketErr);
    }

    return res.status(200).json({
      success: true,
      message: "Invoice marked as paid",
      invoice
    });

  } catch (error: any) {
    console.error("Error updating invoice status:", error?.message, error?.stack);
    return res.status(500).json({ success: false, message: "Failed to update invoice", error: error?.message });
  }
};
