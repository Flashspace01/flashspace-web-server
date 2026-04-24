import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.DB_URI || '');
        const hp = await bcrypt.hash('alpineabhishek@gmail.com', 12);
        await mongoose.connection.db!.collection('users').updateOne(
            { email: 'alpineabhishek@gmail.com' },
            { $set: { fullName: 'Abhishek Bhatt', password: hp } }
        );
        await mongoose.connection.db!.collection('users').deleteOne({ email: 'testpartner@flashspace.co' });
        console.log('Undo successful. alpineabhishek@gmail.com restored.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
