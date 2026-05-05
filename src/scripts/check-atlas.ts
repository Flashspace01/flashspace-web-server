
import mongoose from 'mongoose';

const ATLAS_URI = "mongodb+srv://flash-space:Stirring_minds@flashspace-database.l3kzod7.mongodb.net/test";

const checkAtlasStorage = async () => {
    try {
        console.log('Connecting to MongoDB Atlas (test DB)...');
        await mongoose.connect(ATLAS_URI);
        console.log('Connected!');

        const db = mongoose.connection.db;
        if (!db) throw new Error("DB not connected");
        const collections = await db.listCollections().toArray();

        const stats = [];

        for (const col of collections) {
            const collectionStats = await db.command({ collStats: col.name });
            stats.push({
                name: col.name,
                count: collectionStats.count,
                dataSize: (collectionStats.size || 0) / (1024 * 1024),
                indexSize: (collectionStats.totalIndexSize || 0) / (1024 * 1024),
                totalSize: (collectionStats.storageSize || 0) / (1024 * 1024)
            });
        }

        stats.sort((a, b) => b.dataSize - a.dataSize);

        console.log('\n--- TOP 10 COLLECTIONS BY SIZE ---');
        console.log(`${'Collection'.padEnd(30)} | ${'Count'.padEnd(10)} | ${'Data (MB)'.padEnd(12)} | ${'Total (MB)'.padEnd(10)}`);
        console.log('-'.repeat(70));
        
        stats.slice(0, 10).forEach(s => {
            console.log(`${s.name.padEnd(30)} | ${s.count.toString().padEnd(10)} | ${s.dataSize.toFixed(2).padEnd(12)} | ${s.totalSize.toFixed(2).padEnd(10)}`);
        });

        if (!db) throw new Error("DB not connected");
        const dbStats = await db.command({ dbStats: 1 });
        console.log('\n--- Overall DB Stats ---');
        console.log(`Storage Size (Quota): ${(dbStats.storageSize / (1024 * 1024)).toFixed(2)} MB`);
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

checkAtlasStorage();
