import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

async function checkProperties() {
    try {
        await mongoose.connect(process.env.DB_URI || "mongodb://127.0.0.1:27018/myapp");
        console.log('Connected to DB');
        
        const sampleProperties = await mongoose.connection.db!.collection('properties').find({}).limit(10).toArray();
        console.log(`Found ${sampleProperties.length} sample properties`);
        
        for (const prop of sampleProperties) {
            console.log(`Property: ${prop.name}, Partner ID: ${prop.partner}`);
        }
        
        const partners = await mongoose.connection.db!.collection('users').find({ role: 'partner' }).toArray();
        const partnerIds = partners.map(p => p._id.toString());
        console.log(`Known Partner IDs: ${partnerIds.join(', ')}`);
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkProperties();
