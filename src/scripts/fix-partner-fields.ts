import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function migrate() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/flash');
        console.log('Connected to DB successfully!');

        const collections = ['coworkingspaces', 'virtualoffices', 'meetingrooms'];

        for (const collectionName of collections) {
            console.log(`\nProcessing collection: ${collectionName}`);
            const collection = mongoose.connection.db!.collection(collectionName);

            // Find documents that have partnerId but may be missing partner
            const cursor = collection.find({ partnerId: { $exists: true } });
            const docs = await cursor.toArray();
            console.log(`Found ${docs.length} documents with partnerId`);

            let updatedCount = 0;
            for (const doc of docs) {
                if (doc.partnerId && (!doc.partner || doc.partner.toString() !== doc.partnerId.toString())) {
                    await collection.updateOne(
                        { _id: doc._id },
                        { $set: { partner: doc.partnerId } }
                    );
                    updatedCount++;
                }
            }
            console.log(`Updated ${updatedCount} documents in ${collectionName}`);
        }

        console.log('\nMigration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
