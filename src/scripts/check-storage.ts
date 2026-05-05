
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkStorage = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.DB_URI as string);
        console.log('Connected!');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        console.log('\n--- Database Storage Analysis ---');
        console.log(`${'Collection'.padEnd(30)} | ${'Count'.padEnd(10)} | ${'Avg Size (KB)'.padEnd(15)} | ${'Total (MB)'.padEnd(10)}`);
        console.log('-'.repeat(75));

        const stats = [];

        for (const col of collections) {
            const collectionStats = await db.command({ collStats: col.name });
            const count = collectionStats.count;
            const avgSize = (collectionStats.avgObjSize || 0) / 1024;
            const totalSize = (collectionStats.size || 0) / (1024 * 1024);

            stats.push({
                name: col.name,
                count,
                avgSize: avgSize.toFixed(2),
                totalSize: totalSize.toFixed(2)
            });
        }

        // Sort by total size descending
        stats.sort((a, b) => parseFloat(b.totalSize) - parseFloat(a.totalSize));

        stats.forEach(s => {
            console.log(`${s.name.padEnd(30)} | ${s.count.toString().padEnd(10)} | ${s.avgSize.padEnd(15)} | ${s.totalSize.padEnd(10)}`);
        });

        console.log('\n---------------------------------');
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

checkStorage();
