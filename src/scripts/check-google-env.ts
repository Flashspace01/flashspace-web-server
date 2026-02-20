
import dotenv from 'dotenv';
import path from 'path';

// Specify the path to .env file explicitly to match how the server likely does it (or should)
const envPath = path.join(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('❌ Error loading .env file:', result.error);
} else {
    console.log('✅ .env file loaded successfully');
}

console.log('\n--- Checking Environment Variables ---');
console.log('MEETING_SCHEDULER_GOOGLE_CLIENT_ID:', process.env.MEETING_SCHEDULER_GOOGLE_CLIENT_ID ? '✅ Loaded' : '❌ Missing');
console.log('MEETING_SCHEDULER_GOOGLE_CLIENT_SECRET:', process.env.MEETING_SCHEDULER_GOOGLE_CLIENT_SECRET ? '✅ Loaded' : '❌ Missing');

if (process.env.MEETING_SCHEDULER_GOOGLE_CLIENT_ID) {
    console.log('Client ID length:', process.env.MEETING_SCHEDULER_GOOGLE_CLIENT_ID.length);
}

// Check standard ones too just in case
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Loaded' : '❌ Missing');
