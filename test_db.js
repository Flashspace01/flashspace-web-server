
const axios = require('axios');
const mongoose = require('mongoose');

async function debugAPI() {
   try {
     // Connect directly or use existing auth. Since we don't have a token, we can just test with db
     await mongoose.connect('mongodb://localhost:27017/myapp');
     
     const users = await mongoose.connection.db.collection('users').find({ role: 'partner' }).limit(1).toArray();
     
     if (users.length > 0) {
        const userId = users[0]._id;
        const spaces = await mongoose.connection.db.collection('coworkingspaces').find({ partner: userId }).toArray();
        console.log("Coworking Spaces from DB:", spaces.map(s => ({ id: s._id, property: s.property })));
     }
     await mongoose.disconnect();
   } catch (e) {
     console.error(e);
   }
}
debugAPI();
