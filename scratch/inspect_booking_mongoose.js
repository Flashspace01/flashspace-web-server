const mongoose = require('mongoose');

async function run() {
  const uri = "mongodb://127.0.0.1:27017/flash";
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const bookingNumber = "FS-2026-MOU22ZBH-636";
    const booking = await mongoose.connection.db.collection('bookings').findOne({ bookingNumber });

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
        let profile = null;
        const profileId = new mongoose.Types.ObjectId(review.profileId);
        
        if (review.profileModel === "kyc") profile = await mongoose.connection.db.collection('kycdocuments').findOne({ _id: profileId });
        else if (review.profileModel === "business") profile = await mongoose.connection.db.collection('businessinfos').findOne({ _id: profileId });
        else if (review.profileModel === "partner") profile = await mongoose.connection.db.collection('partnerkycs').findOne({ _id: profileId });
        
        if (profile) {
            console.log(`  Profile found! Documents: ${profile.documents?.length || 0}`);
            const doc = profile.documents?.find(d => 
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
  } finally {
    await mongoose.disconnect();
  }
}

run();
