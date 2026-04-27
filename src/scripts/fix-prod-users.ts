import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function fix() {
    try {
        console.log('Connecting to Cloud DB...');
        // Use the production URI from the .env comment
        const prodUri = "mongodb+srv://flash-space:Stirring_minds@flashspace-database.l3kzod7.mongodb.net/";
        await mongoose.connect(prodUri);
        console.log('Connected!');

        const db = mongoose.connection.db!;
        
        // 1. Fix team@stirringminds.com specifically first
        const specificResult = await db.collection('users').updateOne(
            { email: 'team@stirringminds.com' },
            { $set: { isDeleted: false, isActive: true } }
        );
        console.log('Specific fix for team@stirringminds.com:', specificResult.modifiedCount ? 'SUCCESS' : 'NO CHANGE (already correct or user not found)');

        // 2. Fix all users missing isDeleted or isActive
        const result = await db.collection('users').updateMany(
            { $or: [ { isDeleted: { $exists: false } }, { isActive: { $exists: false } } ] },
            { $set: { isDeleted: false, isActive: true } }
        );
        console.log(`Global fix: Updated ${result.modifiedCount} users who were missing isDeleted/isActive fields.`);

        process.exit(0);
    } catch (err) {
        console.error('Fix failed:', err);
        process.exit(1);
    }
}

fix();
