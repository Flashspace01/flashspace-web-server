import { Request, Response } from "express";
import { google } from "googleapis";
import { LeadModel } from "./lead.model";
import { EmailUtil } from "../authModule/utils/email.util";

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

    // 1. Save to MongoDB (Primary Storage)
    let savedLead: any = null;
    try {
      savedLead = await LeadModel.create({
        name,
        email,
        phone,
        city,
        businessType,
        budget,
        message,
        source,
        page,
        utm,
      });
      console.log("✅ Lead saved to MongoDB:", savedLead._id);
    } catch (dbError: any) {
      console.error("❌ Failed to save lead to MongoDB:", dbError.message);
      // We continue even if DB fails, to try Google Sheets/Email
    }

    // 2. Send Admin Email Notification
    try {
      const adminEmail = process.env.ADMIN_EMAIL || "yogeshbisht12122005@gmail.com";
      const subject = `🚀 New Lead: ${name} (${city || "General"})`;
      const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #EDB003; padding-bottom: 10px;">New Website Lead</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr><td style="padding: 8px; font-weight: bold; width: 120px;">Name:</td><td style="padding: 8px;">${name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td style="padding: 8px;"><a href="tel:${phone}">${phone}</a></td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">City:</td><td style="padding: 8px;">${city || "N/A"}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Interest:</td><td style="padding: 8px;">${businessType || "N/A"}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Budget:</td><td style="padding: 8px;">${budget || "N/A"}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Page:</td><td style="padding: 8px;"><small>${page || "N/A"}</small></td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Message:</td><td style="padding: 8px; background: #f9f9f9;">${message || "No message provided"}</td></tr>
          </table>
          <div style="margin-top: 30px; font-size: 12px; color: #7f8c8d; text-align: center;">
            Sent from FlashSpace Website Lead System
          </div>
        </div>
      `;
      
      await EmailUtil.sendEmail({ to: adminEmail, subject, html });
      console.log("✅ Admin notification email sent");
    } catch (emailError: any) {
      console.error("⚠️ Failed to send admin notification email:", emailError.message);
    }

    // 3. Append to Google Sheets (Optional Connector)
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let serviceAccountPrivateKey = process.env.GOOGLE_PRIVATE_KEY || "";

    if (!spreadsheetId || !serviceAccountEmail || !serviceAccountPrivateKey) {
      console.warn("⚠️ Google Sheets credentials are not fully configured. Skipping sheet update.");
      // Return success because DB and Email are handled
      return res.status(201).json({ 
        ok: true, 
        message: "Lead submitted successfully",
        id: savedLead?._id 
      });
    }

    try {
      // Private key parsing
      if (serviceAccountPrivateKey.startsWith('"') && serviceAccountPrivateKey.endsWith('"')) {
        serviceAccountPrivateKey = serviceAccountPrivateKey.substring(1, serviceAccountPrivateKey.length - 1);
      }
      serviceAccountPrivateKey = serviceAccountPrivateKey.replace(/\\n/g, "\n");

      const auth = new google.auth.JWT({
        email: serviceAccountEmail,
        key: serviceAccountPrivateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const sheets = google.sheets({ version: "v4", auth });
      const sheetName = process.env.GOOGLE_SHEET_NAME || "Leads";

      // Discovery
      let targetSheet = sheetName;
      try {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetName);
        if (!exists) {
          const firstSheetName = spreadsheet.data.sheets?.[0]?.properties?.title;
          if (firstSheetName) targetSheet = firstSheetName;
        }
      } catch (e: any) {
        console.warn("DEBUG - Sheet discovery failed, using default name:", e.message);
      }

      const row = [
        new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        String(name).trim(),
        String(email).trim(),
        String(phone).trim(),
        page ? String(page).trim() : (source || "Website"),
        message ? String(message).trim() : (businessType ? `Interested in ${businessType}` : ""),
        "Received",
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${targetSheet}'!A:A`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });
      console.log("✅ Lead appended to Google Sheets");
    } catch (sheetError: any) {
      console.error("❌ Google Sheets append failed:", sheetError.message);
      // We don't fail the request if only the sheet fails
    }

    return res.status(201).json({ 
      ok: true, 
      message: "Lead submitted successfully",
      id: savedLead?._id 
    });

  } catch (error: any) {
    console.error("CRITICAL - Lead submission loop failed:", error.message);
    return res.status(500).json({ ok: false, message: "Submission failed: " + error.message });
  }
};
