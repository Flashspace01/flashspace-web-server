import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function check() {
    try {
        await mongoose.connect(process.env.DB_URI || '');
        console.log('Connected!');

        const propertyCount = await mongoose.connection.db!.collection('properties').countDocuments();
        const coworkingCount = await mongoose.connection.db!.collection('coworkingspaces').countDocuments();
        const virtualOfficeCount = await mongoose.connection.db!.collection('virtualoffices').countDocuments();
        const meetingRoomCount = await mongoose.connection.db!.collection('meetingrooms').countDocuments();

        console.log('--- DB COUNTS ---');
        console.log('Properties:', propertyCount);
        console.log('Coworking Spaces:', coworkingCount);
        console.log('Virtual Offices:', virtualOfficeCount);
        console.log('Meeting Rooms:', meetingRoomCount);

        if (coworkingCount > 0) {
            const sample = await mongoose.connection.db!.collection('coworkingspaces').findOne();
            console.log('\nSample Coworking Space:');
            console.log('- Name:', sample?.name);
            console.log('- isActive:', sample?.isActive);
            console.log('- approvalStatus:', sample?.approvalStatus);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
