import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.DB_URI || '');
        const res = await mongoose.connection.db!.collection('users').updateOne(
            { email: 'testpartner@flashspace.co' },
            { $set: { role: 'user' } }
        );
        console.log('Update result:', res.modifiedCount);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
