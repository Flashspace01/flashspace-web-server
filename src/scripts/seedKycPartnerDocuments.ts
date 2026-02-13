import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import KycPartnerDocuments from "../flashspaceWeb/userDashboardModule/models/kycPartnerDocument.model";

const seedKycPartnerDocuments = async () => {
  try {
    if (!process.env.DB_URI) {
      console.error("DB_URI is not defined in environment variables");
      process.exit(1);
    }

    await mongoose.connect(process.env.DB_URI);
    console.log("Connected to Database");

    const demoDoc = await KycPartnerDocuments.create({
      user: new mongoose.Types.ObjectId(),
      partnerInfo: {
        fullName: "Demo Partner",
        email: "demo.partner@example.com",
        phone: "9999999999",
        panNumber: "ABCDE1234F",
        aadhaarNumber: "123412341234",
        verified: false,
      },
      overallStatus: "pending",
      progress: 10,
      isDeleted: false,
      documents: [
        {
          type: "pan_card",
          name: "Demo PAN Document",
          fileUrl: "https://example.com/demo-pan.pdf",
          status: "pending",
        },
      ],
    });

    console.log("Inserted demo KycPartnerDocuments record:", demoDoc._id.toString());
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed KycPartnerDocuments:", error);
    process.exit(1);
  }
};

seedKycPartnerDocuments();
