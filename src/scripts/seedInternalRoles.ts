import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel, UserRole, AuthProvider } from '../flashspaceWeb/authModule/models/user.model';
import { PasswordUtil } from '../flashspaceWeb/authModule/utils/password.util';

dotenv.config();

const internalUsers = [
    {
        email: 'superadmin@flashspace.co',
        fullName: 'Super Admin',
        role: UserRole.SUPER_ADMIN,
        password: 'Password@123',
    },
    {
        email: 'admin@flashspace.co',
        fullName: 'System Admin',
        role: UserRole.ADMIN,
        password: 'Password@123',
    },
    {
        email: 'support.agent@flashspace.co',
        fullName: 'Test Support',
        role: UserRole.SUPPORT,
        password: 'Password@123',
    },
    {
        email: 'sales.exec@flashspace.co',
        fullName: 'Test Sales',
        role: UserRole.SALES,
        password: 'Password@123',
    },
    {
        email: 'partner.manager@flashspace.co',
        fullName: 'Test Space Partner Manager',
        role: UserRole.SPACE_PARTNER_MANAGER,
        password: 'Password@123',
    },
    {
        email: 'affiliate.manager@flashspace.co',
        fullName: 'Test Affiliate Manager',
        role: UserRole.AFFILIATE_MANAGER,
        password: 'Password@123',
    }
];

async function seedInternalRoles() {
    try {
        console.log('🚀 Connecting to database...');
        await mongoose.connect(process.env.DB_URI as string);
        console.log('✅ Connected to database.');

        for (const userData of internalUsers) {
            const existingUser = await UserModel.findOne({ email: userData.email.toLowerCase() });

            const hashedPassword = await PasswordUtil.hash(userData.password);

            const userPayload: any = {
                ...userData,
                email: userData.email.toLowerCase(),
                password: hashedPassword,
                authProvider: AuthProvider.LOCAL,
                isEmailVerified: true,
                isActive: true,
                isDeleted: false
            };

            if (existingUser) {
                console.log(`ℹ️ User ${userData.email} already exists. Updating...`);
                await UserModel.findByIdAndUpdate(existingUser._id, userPayload);
            } else {
                console.log(`✨ Creating user ${userData.email}...`);
                await UserModel.create(userPayload);
            }
        }

        console.log('✅ Internal roles seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding internal roles:', error);
        process.exit(1);
    }
}

seedInternalRoles();
