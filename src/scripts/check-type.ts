import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

async function checkPropertyPartnerType() {
    try {
        await mongoose.connect(process.env.DB_URI || "mongodb://127.0.0.1:27018/myapp");
        console.log('Connected to DB');
        
        const properties = await mongoose.connection.db!.collection('properties').find({}).limit(5).toArray();
        for (const prop of properties) {
            console.log(`Property: ${prop.name}, Partner Field Type: ${typeof prop.partner}, Value: ${prop.partner}, IsObjectId: ${prop.partner instanceof mongoose.Types.ObjectId}`);
        }
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkPropertyPartnerType();
