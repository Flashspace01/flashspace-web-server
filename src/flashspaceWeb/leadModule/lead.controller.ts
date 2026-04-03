import { Request, Response } from "express";
import { google } from "googleapis";

export const createLead = async (req: Request, res: Response) => {
  try {
    const configuredApiKey = process.env.LEAD_API_KEY;
    const incomingApiKey = req.header("x-api-key");
    if (configuredApiKey && incomingApiKey !== configuredApiKey) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const { name, email, phone, city, businessType, budget, message, source, page, utm } = req.body || {};

    if (!name || !email || !phone) {
      return res.status(400).json({ ok: false, message: "Missing required fields (name, email, phone)" });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    // Robust private key parsing
    let serviceAccountPrivateKey = process.env.GOOGLE_PRIVATE_KEY || "";
    // 1. Remove wrapping quotes if dotenv didn't handle them
    if (serviceAccountPrivateKey.startsWith('"') && serviceAccountPrivateKey.endsWith('"')) {
      serviceAccountPrivateKey = serviceAccountPrivateKey.substring(1, serviceAccountPrivateKey.length - 1);
    }
    // 2. Convert literal \n strings to real newlines
    serviceAccountPrivateKey = serviceAccountPrivateKey.replace(/\\n/g, "\n");

    const sheetName = process.env.GOOGLE_SHEET_NAME || "Leads";

    if (!spreadsheetId || !serviceAccountEmail || !serviceAccountPrivateKey) {
      return res.status(500).json({ ok: false, message: "Google Sheets credentials are not configured" });
    }

    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: serviceAccountPrivateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Robust sheet discovery
    let targetSheet = sheetName;
    try {
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const firstSheetName = spreadsheet.data.sheets?.[0]?.properties?.title;
      // If the provided sheetName is not found or empty, fallback to the first sheet
      const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetName);
      if (!exists || !sheetName) {
        if (firstSheetName) {
            targetSheet = firstSheetName;
            console.log(`DEBUG - Sheet "${sheetName}" not found. Falling back to first sheet: "${targetSheet}"`);
        }
      }
    } catch (e: any) {
      console.error("DEBUG - Failed to fetch spreadsheet metadata:", e.message);
    }

    // Construct a descriptive info field if city is missing
    let info = city ? String(city).trim() : "";
    if (!info && businessType) {
      info = `${businessType}${budget ? ` (${budget})` : ""}`;
    }

    const row = [
      new Date().toISOString(),
      String(name).trim(),
      String(email).trim(),
      String(phone).trim(),
      page ? String(page).trim() : "", // source column (now URL only)
      message ? String(message).trim() : "", // next column (message)
      "received",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${targetSheet}'!A:A`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

    return res.status(201).json({ ok: true });
  } catch (error: any) {
    console.error("DEBUG - Lead submission failed:", error.message);
    if (error.response?.data) {
      console.error("Google API Error Data:", error.response.data);
    }
    return res.status(500).json({ ok: false, message: "Lead submission failed: " + error.message });
  }
};
