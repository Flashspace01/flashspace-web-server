import mongoose from "mongoose";
import { BookingModel } from "./src/flashspaceWeb/bookingModule/booking.model";
import { KYCDocumentModel } from "./src/flashspaceWeb/userDashboardModule/models/kyc.model";
import { BusinessInfoModel } from "./src/flashspaceWeb/userDashboardModule/models/businessInfo.model";
import { PartnerKYCModel } from "./src/flashspaceWeb/userDashboardModule/models/partnerKYC.model";

async function run() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/flash"); // Adjust URI if needed
    console.log("Connected to MongoDB");

    const bookingNumber = "FS-2026-MOU22ZBH-636";
    const booking = await BookingModel.findOne({ bookingNumber });

    if (!booking) {
      console.log("Booking not found");
      process.exit(1);
    }

    console.log("Booking found:", booking.bookingNumber);
    console.log("KYC Status:", booking.kycStatus);
    console.log("KYC Document Reviews:", JSON.stringify(booking.kycDocumentReviews, null, 2));

    const reviews = booking.kycDocumentReviews || [];
    for (const review of reviews) {
        console.log(`Checking profile: ${review.profileModel} ID: ${review.profileId}`);
        let profile: any = null;
        if (review.profileModel === "kyc") profile = await KYCDocumentModel.findById(review.profileId);
        else if (review.profileModel === "business") profile = await BusinessInfoModel.findById(review.profileId);
        else if (review.profileModel === "partner") profile = await PartnerKYCModel.findById(review.profileId);
        
        if (profile) {
            console.log(`  Profile found! Documents: ${profile.documents?.length || 0}`);
            const doc = profile.documents?.find((d: any) => 
                (review.documentId && String(d._id) === String(review.documentId)) ||
                (review.documentType && d.type === review.documentType)
            );
            if (doc) {
                console.log(`    Document found: ${doc.type} Status: ${doc.partnerReviewStatus}`);
            } else {
                console.log(`    Document NOT found in profile documents!`);
            }
        } else {
            console.log(`  Profile NOT found!`);
        }
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
