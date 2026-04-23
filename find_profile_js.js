const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/flashspace';
const ID = '69e353dc23afddcd45280083';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const collections = ['kycdocuments', 'businessinfos', 'partnerkycs'];
  
  for (const colName of collections) {
    const doc = await mongoose.connection.collection(colName).findOne({ _id: new mongoose.Types.ObjectId(ID) });
    if (doc) {
      console.log(`Found in collection: ${colName}`);
      console.log(JSON.stringify(doc, null, 2));
    }
  }

  const user = await mongoose.connection.collection('users').findOne({ _id: new mongoose.Types.ObjectId(ID) });
  if (user) {
    console.log(`Found in users collection`);
    console.log(JSON.stringify(user, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(console.error);
