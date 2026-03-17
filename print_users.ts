import mongoose from 'mongoose';
import { UserModel } from './src/flashspaceWeb/authModule/models/user.model';

async function check() {
    await mongoose.connect('mongodb://localhost:27017/myapp');
    const users = await UserModel.find({}, { email: 1, role: 1 });
    users.forEach(u => console.log(`${u._id} | ${u.email} | ${u.role}`));
    process.exit(0);
}
check();
