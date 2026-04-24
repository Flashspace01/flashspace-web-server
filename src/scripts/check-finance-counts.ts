
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const PaymentSchema = new mongoose.Schema({}, { strict: false });
const PartnerInvoiceSchema = new mongoose.Schema({}, { strict: false });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  console.log('Connected to DB');

  const Payment = mongoose.model('payments', PaymentSchema);
  const PartnerInvoice = mongoose.model('partnerinvoices', PartnerInvoiceSchema);

  const paymentCount = await Payment.countDocuments();
  const partnerInvoiceCount = await PartnerInvoice.countDocuments();

  console.log('--- DB COUNTS ---');
  console.log('Payments:', paymentCount);
  console.log('Partner Invoices:', partnerInvoiceCount);

  await mongoose.disconnect();
}

run().catch(console.error);
