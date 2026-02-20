import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as readline from 'readline';
import { PasswordUtil } from '../flashspaceWeb/authModule/utils/password.util';
import { UserModel, UserRole, AuthProvider } from '../flashspaceWeb/authModule/models/user.model';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer);
        });
    });
};

const connectDB = async () => {
    try {
        const mongoURI = process.env.DB_URI;
        if (!mongoURI) {
            console.error('❌ MONGODB_URI is not defined in environment variables');
            process.exit(1);
        }
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const createUser = async () => {
    try {
        await connectDB();

        console.log('\n--- Create New User ---\n');

        const fullName = await question('Enter Full Name: ');
        if (!fullName) {
            console.error('❌ Full Name is required');
            process.exit(1);
        }

        const email = await question('Enter Email: ');
        if (!email) {
            console.error('❌ Email is required');
            process.exit(1);
        }

        // Check if user exists
        const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            console.error(`❌ User with email ${email} already exists`);
            process.exit(1);
        }

        const password = await question('Enter Password: ');
        if (!password) {
            console.error('❌ Password is required');
            process.exit(1);
        }

        const phone = await question('Enter Phone Number (optional): ');

        const roleInput = await question(`Enter Role (user/admin/partner/sales) [default: user]: `);

        let role = UserRole.USER;
        if (roleInput) {
            const normalizedRole = roleInput.toLowerCase().trim();
            if (Object.values(UserRole).includes(normalizedRole as UserRole)) {
                role = normalizedRole as UserRole;
            } else {
                console.warn(`⚠️ Invalid role "${roleInput}", defaulting to "user"`);
            }
        }

        console.log('\nCreating user...');

        // Hash password
        const hashedPassword = await PasswordUtil.hash(password);

        // Create user object
        const userData = {
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,
            phoneNumber: phone || undefined,
            role,
            authProvider: AuthProvider.LOCAL,
            isEmailVerified: true, // Auto-verify manually created users
            isActive: true, // Auto-activate
            credits: 0,
            refreshTokens: []
        };

        const newUser = await UserModel.create(userData);

        console.log('\n✅ User created successfully!');
        console.log('--------------------------------');
        console.log(`ID:       ${newUser._id}`);
        console.log(`Name:     ${newUser.fullName}`);
        console.log(`Email:    ${newUser.email}`);
        console.log(`Role:     ${newUser.role}`);
        console.log(`Verified: ${newUser.isEmailVerified}`);
        console.log('--------------------------------');

    } catch (error) {
        console.error('❌ Error creating user:', error);
    } finally {
        await mongoose.disconnect();
        rl.close();
        process.exit(0);
    }
};

createUser();
