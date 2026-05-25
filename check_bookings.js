const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/flash', { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  const b = await db.collection('bookings').find({}).sort({ createdAt: -1 }).limit(5).toArray();
  b.forEach(x => {
    console.log(`Booking ID: ${x._id}`);
    console.log(`Plan:`, JSON.stringify(x.plan, null, 2));
    const paidAmount = Number(x.plan?.price || x.plan?.finalPrice || 0);
    const partnerBaseAmount = Number(x.plan?.partnerPrice || 0);
    const comm = partnerBaseAmount > 0 ? Math.max(0, paidAmount - partnerBaseAmount) : (paidAmount * 0.15);
    console.log(`Calculated Commission: ${comm}`);
    console.log('---');
  });
  mongoose.disconnect();
}
check();
