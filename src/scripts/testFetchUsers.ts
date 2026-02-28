import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../flashspaceWeb/authModule/models/user.model';
import { AdminService } from '../flashspaceWeb/adminModule/services/admin.service';

const adminService = new AdminService();

dotenv.config();

async function testFetchUsers() {
    try {
        console.log('🚀 Connecting to database...');
        await mongoose.connect(process.env.DB_URI as string);
        console.log('✅ Connected to database:', mongoose.connection.name);

        const result = await adminService.getUsers(1, 10);
        console.log('\n📊 AdminService.getUsers() Result:');
        console.log(JSON.stringify(result.data.stats, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fetching users:', error);
        process.exit(1);
    }
}

testFetchUsers();
