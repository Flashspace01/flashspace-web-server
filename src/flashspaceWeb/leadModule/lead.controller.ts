import { Request, Response } from "express";
import { google } from "googleapis";
import { LeadModel } from "./lead.model";
import { BookingLeadModel } from "./bookingLead.model";
import { EmailUtil } from "../authModule/utils/email.util";
import { PaymentModel, PaymentStatus } from "../paymentModule/payment.model";

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
      
      EmailUtil.sendEmail({ to: adminEmail, subject, html })
        .then(() => console.log("✅ Admin notification email sent"))
        .catch(err => console.error("⚠️ Failed to send admin notification email:", err.message));
    } catch (emailError: any) {
      console.error("⚠️ Failed to send admin notification email:", emailError.message);
    }

    // 3. Append to Google Sheets
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let serviceAccountPrivateKey = process.env.GOOGLE_PRIVATE_KEY || "";

    if (spreadsheetId && serviceAccountEmail && serviceAccountPrivateKey) {
      try {
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

        let targetSheet = sheetName;
        try {
          const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
          const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetName);
          if (!exists) {
            const firstSheetName = spreadsheet.data.sheets?.[0]?.properties?.title;
            if (firstSheetName) targetSheet = firstSheetName;
          }
        } catch (e: any) {}

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
      }
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

export const getLeads = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Fetch from both models
    const [generalLeads, bookingLeads] = await Promise.all([
      LeadModel.find(query).sort({ createdAt: -1 }).lean(),
      BookingLeadModel.find({
        ...query,
        $or: [
          { status: "converted" },
          { status: "cancelled" },
          { status: "pending", createdAt: { $lt: new Date(Date.now() - 150000) } },
        ],
      }).sort({ createdAt: -1 }).lean()
    ]);

    const totalLeadsCount = generalLeads.length + bookingLeads.length;

    // Fetch payments for booking leads
    const bookingLeadEmails = [...new Set(bookingLeads.map((l: any) => l.email?.toLowerCase().trim()).filter(Boolean))];
    const paidPaymentKeys = new Set<string>();
    
    if (bookingLeadEmails.length > 0) {
      const completedPayments = await PaymentModel.find({
        userEmail: { $in: bookingLeadEmails },
        status: PaymentStatus.COMPLETED,
      }).select("userEmail space").lean();

      completedPayments.forEach((p: any) => {
        paidPaymentKeys.add(`${p.userEmail?.toLowerCase().trim()}:${p.space?.toString()}`);
      });
    }

    // Normalize and Combine
    const normalizedGeneral = generalLeads.map((l: any) => ({
      _id: l._id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      interest: l.businessType || "General Inquiry",
      source: l.source || "Website Form",
      createdAt: l.createdAt,
      type: "general",
      paymentStatus: l.leadStatus || "pending",
      leadStatus: l.leadStatus || "pending",
      rawStatus: l.status || "pending",
    }));

    const normalizedBooking = bookingLeads.map((l: any) => {
      const email = l.email?.toLowerCase().trim();
      const spaceId = l.spaceId?.toString();
      const hasPaid = email && spaceId ? paidPaymentKeys.has(`${email}:${spaceId}`) : false;
      const status = l.status === "cancelled" ? "cancelled" : (hasPaid || l.status === "converted" ? "paid" : "pending");

      return {
        _id: l._id,
        name: l.name || "Booking Lead",
        email: l.email,
        phone: l.phone,
        interest: l.spaceName || "Space Booking",
        source: "Booking Lead",
        createdAt: l.createdAt,
        type: "booking",
        paymentStatus: status,
        leadStatus: status,
        rawStatus: l.status || "pending",
      };
    });

    const allLeads = [...normalizedGeneral, ...normalizedBooking].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginatedLeads = allLeads.slice(skip, skip + limit);

    return res.status(200).json({ 
      ok: true, 
      data: paginatedLeads,
      pagination: {
        total: totalLeadsCount,
        page,
        limit,
        pages: Math.ceil(totalLeadsCount / limit)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message });
  }
};

export const updateBookingLeadStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const statusMap: Record<string, string> = { paid: "converted", pending: "pending", cancelled: "cancelled" };

    if (!statusMap[status]) return res.status(400).json({ ok: false, message: "Invalid status" });

    let updated = await BookingLeadModel.findByIdAndUpdate(id, { status: statusMap[status], leadStatus: status }, { new: true }).lean();
    if (!updated) {
      updated = await LeadModel.findByIdAndUpdate(id, { leadStatus: status }, { new: true }).lean();
    }

    if (!updated) return res.status(404).json({ ok: false, message: "Lead not found" });
    return res.status(200).json({ ok: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message });
  }
};

export const createBookingLead = async (req: Request, res: Response) => {
  try {
    const { userId, name, email, phone, spaceId, spaceName, utm } = req.body || {};
    if (!email || !phone || !spaceId) return res.status(400).json({ ok: false, message: "Missing fields" });

    const bookingLead = await BookingLeadModel.create({ userId, name, email, phone, spaceId, spaceName, utm });
    
    // Admin notification
    const adminEmail = process.env.ADMIN_EMAIL || "yogeshbisht12122005@gmail.com";
    EmailUtil.sendEmail({ 
      to: adminEmail, 
      subject: `📅 New Booking Lead: ${spaceName}`, 
      html: `<p>New interest in ${spaceName} from ${email} (${phone})</p>` 
    }).catch(() => {});

    return res.status(201).json({ ok: true, id: bookingLead._id });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message });
  }
};
