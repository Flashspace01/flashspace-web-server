import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function debug() {
    try {
        console.log('Connecting to Cloud DB...');
        await mongoose.connect(process.env.DB_URI || '');
        console.log('Connected!');

        const user = await mongoose.connection.db.collection('users').findOne({ email: 'alpineabhishek@gmail.com' });
        
        if (user) {
            console.log('USER FOUND:');
            console.log('- ID:', user._id);
            console.log('- Role:', user.role);
            console.log('- Password Length:', user.password ? user.password.length : 'MISSING');
            console.log('- isDeleted:', user.isDeleted);
            console.log('- isActive:', user.isActive);
        } else {
            console.log('USER NOT FOUND IN CURRENT DATABASE!');
            const dbs = await mongoose.connection.db.admin().listDatabases();
            console.log('Available Databases:', dbs.databases.map(d => d.name));
            console.log('Current DB Name:', mongoose.connection.db.databaseName);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
