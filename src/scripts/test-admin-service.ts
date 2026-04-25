import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { AdminService } from '../flashspaceWeb/adminModule/services/admin.service';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

async function testAdminService() {
    try {
        await mongoose.connect(process.env.DB_URI || "mongodb://127.0.0.1:27018/myapp");
        console.log('Connected to DB');
        
        const adminService = new AdminService();
        const result = await adminService.getPartners(1, 10);
        
        console.log('Result Success:', result.success);
        if (result.success) {
            console.log('Partners count in response:', result.data.partners.length);
            for (const p of result.data.partners) {
                console.log(`Partner: ${p.name}, Spaces: ${p.totalSpaces}`);
            }
        }
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

testAdminService();
