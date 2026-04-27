import mongoose from 'mongoose';
import { UserModel } from './src/flashspaceWeb/authModule/models/user.model';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.DB_URI!);
        const admins = await UserModel.find({ role: { $in: ['admin', 'super_admin'] } }).select('email role fullName');
        console.log("Admins:", admins);
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

check();
