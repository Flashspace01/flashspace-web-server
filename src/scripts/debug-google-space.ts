
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const CoworkingSpaceSchema = new mongoose.Schema({
  approvalStatus: String,
  isActive: Boolean,
  isDeleted: Boolean,
  partner: String,
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' }
}, { strict: false });

const PropertySchema = new mongoose.Schema({
  name: String,
  city: String,
  isActive: Boolean,
  status: String,
  kycStatus: String
}, { strict: false });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  console.log('Connected to DB');

  const CoworkingSpace = mongoose.model('coworkingspaces', CoworkingSpaceSchema);
  const Property = mongoose.model('Properties', PropertySchema);

  console.log('--- Searching for "Google" ---');
  const properties = await Property.find({ name: /Google/i });
  console.log('Found Properties:', JSON.stringify(properties, null, 2));

  for (const prop of properties) {
    const spaces = await CoworkingSpace.find({ property: prop._id });
    console.log(`Spaces for Property ${prop.name}:`, JSON.stringify(spaces, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(console.error);
