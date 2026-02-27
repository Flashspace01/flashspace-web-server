const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// Mocking models and service context to test AdminService logic
// Since AdminService is complex, we'll just import it and use it with a real DB connection
// We need to register all models used by AdminService
require('ts-node').register();
const { adminService } = require('./src/flashspaceWeb/adminModule/services/admin.service');

async function verifyFix() {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected to DB for verification');

    const kycId = '69904150593dc6f16b487f5c';
    const userId = '6989ccdefc41b1c899d3cd33';

    console.log('\n--- Testing Search by KYC ID ---');
    const res1 = await adminService.getPartnerDetails(kycId);
    console.log('Success:', res1.success);
    console.log('Message:', res1.message);
    if (res1.success) console.log('Data Found (ID):', res1.data._id);

    console.log('\n--- Testing Search by USER ID (The fallback) ---');
    const res2 = await adminService.getPartnerDetails(userId);
    console.log('Success:', res2.success);
    console.log('Message:', res2.message);
    if (res2.success) console.log('Data Found (ID):', res2.data._id);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Verification failed:', err);
  }
}

verifyFix();
