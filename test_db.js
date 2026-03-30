
require('dotenv').config();
const mongoose = require('mongoose');
const { PropertyModel } = require('./src/flashspaceWeb/propertyModule/property.model');

async function test() {
  await mongoose.connect(process.env.DB_URI);
  const total = await PropertyModel.countDocuments({});
  const hasId = await PropertyModel.countDocuments({ spaceId: { $ne: null, $exists: true, $ne: "" } });
  
  console.log('--- DB Check ---');
  console.log('TOTAL PROPERTIES:', total);
  console.log('PROPERTIES WITH NON-EMPTY spaceId:', hasId);
  
  const sample = await PropertyModel.find({ city: 'Delhi' }).limit(5);
  console.log('--- DELHI SAMPLE ---');
  for (const p of sample) {
    console.log(`- ${p.name}: [${p.spaceId}]`);
  }
  
  process.exit(0);
}
test();
