import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function fix() {
    try {
        await mongoose.connect(process.env.DB_URI || '');
        console.log('Connected!');

        console.log('Updating Coworking Spaces...');
        const cwRes = await mongoose.connection.db!.collection('coworkingspaces').updateMany(
            {},
            { $set: { approvalStatus: 'active', isActive: true } }
        );
        console.log(`Updated ${cwRes.modifiedCount} Coworking Spaces.`);

        console.log('Updating Virtual Offices...');
        const voRes = await mongoose.connection.db!.collection('virtualoffices').updateMany(
            {},
            { $set: { approvalStatus: 'active', isActive: true } }
        );
        console.log(`Updated ${voRes.modifiedCount} Virtual Offices.`);

        console.log('Updating Meeting Rooms...');
        const mrRes = await mongoose.connection.db!.collection('meetingrooms').updateMany(
            {},
            { $set: { approvalStatus: 'active', isActive: true } }
        );
        console.log(`Updated ${mrRes.modifiedCount} Meeting Rooms.`);
        
        console.log('Updating Properties...');
        const pRes = await mongoose.connection.db!.collection('properties').updateMany(
            {},
            { $set: { status: 'active', isActive: true } }
        );
        console.log(`Updated ${pRes.modifiedCount} Properties.`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
