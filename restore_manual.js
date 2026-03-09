const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        if (!process.env.DB_URI) {
            console.error('No DB_URI');
            process.exit(1);
        }
        await mongoose.connect(process.env.DB_URI);
        console.log('Connected to DB');
        
        const db = mongoose.connection.db;
        
        // Infer collection names (Typegoose default: lowercase, plural)
        // VirtualOffice -> virtualoffices
        // CoworkingSpace -> coworkingspaces
        
        const r1 = await db.collection('virtualoffices').updateMany(
            { isDeleted: true },
            { $set: { isDeleted: false, isActive: true } }
        );
        console.log(`Restored ${r1.modifiedCount} Virtual Offices`);

        const r2 = await db.collection('coworkingspaces').updateMany(
            { isDeleted: true },
            { $set: { isDeleted: false, isActive: true } }
        );
        console.log(`Restored ${r2.modifiedCount} Coworking Spaces`);
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
