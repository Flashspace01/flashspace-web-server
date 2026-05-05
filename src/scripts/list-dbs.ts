
import mongoose from 'mongoose';

const ATLAS_URI = "mongodb+srv://flash-space:Stirring_minds@flashspace-database.l3kzod7.mongodb.net/";

const listDatabases = async () => {
    try {
        console.log('Connecting to MongoDB Atlas Cluster...');
        const client = await mongoose.connect(ATLAS_URI);
        console.log('Connected!');

        const adminDb = mongoose.connection.client.db().admin();
        const dbs = await adminDb.listDatabases();

        console.log('\n--- Databases on Cluster ---');
        dbs.databases.forEach((db: any) => {
            console.log(`- ${db.name.padEnd(20)} | Size: ${(db.sizeOnDisk / (1024 * 1024)).toFixed(2)} MB`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

listDatabases();
