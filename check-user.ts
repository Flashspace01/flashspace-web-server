import mongoose from 'mongoose';
import { UserModel } from './src/flashspaceWeb/authModule/models/user.model';
import dotenv from 'dotenv';

dotenv.config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/flash');
    console.log('Connected to MongoDB');

    const user = await UserModel.findById('69e7147c2a4818e6280cad8f').lean();
    if (user) {
      console.log(`User: ${user.fullName}`);
      console.log(`Role: ${user.role}`);
      console.log(`Email: ${user.email}`);
    } else {
      console.log('User not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
