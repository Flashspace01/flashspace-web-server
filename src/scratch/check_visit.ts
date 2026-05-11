import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const VisitSchema = new mongoose.Schema({
    visitorEmail: String,
    visitorNumber: String,
    visitor: String,
}, { strict: false });

const Visit = mongoose.model('Visit', VisitSchema, 'visits');

async function check() {
    try {
        const uri = process.env.DB_URI || process.env.MONGODB_URI;
        if (!uri) {
            console.error("DB_URI is not defined in .env");
            return;
        }
        await mongoose.connect(uri);
        console.log("Connected to DB");
        const lastVisit = await Visit.findOne().sort({ createdAt: -1 }).lean();
        console.log("Last Visit Record:", JSON.stringify(lastVisit, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

check();
