// src/scripts/setup-test-users.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

// Connect to MongoDB
const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/flashspace';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'user' },
  isEmailVerified: { type: Boolean, default: true },
  phoneNumber: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function setupUsers() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    const users = [
      {
        email: 'admin@flashspace.com',
        fullName: 'Test Admin',
        password: 'Admin@123',
        role: 'admin',
        isEmailVerified: true,
        phoneNumber: '+91-9876543210'
      },
      {
        email: 'partner@flashspace.com',
        fullName: 'Test Partner',
        password: 'Partner@123',
        role: 'partner',
        isEmailVerified: true,
        phoneNumber: '+91-9876543211'
      },
      {
        email: 'manager@flashspace.com',
        fullName: 'Test Space Manager',
        password: 'Manager@123',
        role: 'space_manager',
        isEmailVerified: true,
        phoneNumber: '+91-9876543212'
      },
      {
        email: 'sales@flashspace.com',
        fullName: 'Test Sales',
        password: 'Sales@123',
        role: 'sales',
        isEmailVerified: true,
        phoneNumber: '+91-9876543213'
      },
      {
        email: 'user@flashspace.com',
        fullName: 'Test User',
        password: 'User@123',
        role: 'user',
        isEmailVerified: true,
        phoneNumber: '+91-9876543214'
      }
    ];

    console.log('\n👤 Creating test users...');
    
    for (const user of users) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: user.email });
      
      if (existingUser) {
        // Update existing user
        const hashedPassword = await bcrypt.hash(user.password, 12);
        existingUser.password = hashedPassword;
        existingUser.role = user.role;
        await existingUser.save();
        console.log(`↻ Updated ${user.role} user: ${user.email}`);
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(user.password, 12);
        await User.create({
          ...user,
          password: hashedPassword
        });
        console.log(`✅ Created ${user.role} user: ${user.email}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 ALL TEST USERS SETUP COMPLETE!');
    console.log('='.repeat(50));
    
    // Display created users
    const allUsers = await User.find({}, 'email role -_id');
    console.log('\n📋 Current Users in Database:');
    console.log('-' .repeat(40));
    allUsers.forEach(user => {
      console.log(`${user.email.padEnd(30)} → ${user.role}`);
    });

    console.log('\n🚀 Next step: Run RBAC tests with:');
    console.log('npm run test:rbac');

    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error setting up test users:', error);
    process.exit(1);
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n\n👋 Script terminated by user');
  await mongoose.disconnect();
  process.exit(0);
});

// Run the setup
setupUsers();