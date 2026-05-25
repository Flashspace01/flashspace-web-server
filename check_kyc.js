const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

mongoose.connect(process.env.DB_URI).then(async () => {
  const kyc = await mongoose.connection.collection('kycdocuments').find({}).toArray();
  console.log('KYCs:', kyc.length);
  const users = await mongoose.connection.collection('users').find({ _id: { $in: kyc.map(k => k.user) } }).toArray();
  console.log('Users mapped to KYC:', users.map(u => ({ email: u.email, role: u.role })));
  process.exit(0);
});
