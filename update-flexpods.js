const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/flash');
  const db = mongoose.connection.db;
  await db.collection('properties').updateOne(
    { _id: new mongoose.Types.ObjectId('6a16d8ec657da033df198604') },
    { $set: { name: 'FlexPods' } }
  );
  console.log('Successfully updated FlexPod to FlexPods!');
  process.exit(0);
}

run().catch(console.error);
