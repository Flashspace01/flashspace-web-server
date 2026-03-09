
import dotenv from 'dotenv';
import path from 'path';
import { MeetingEmailUtil } from '../flashspaceWeb/meetingSchedulerModule/email.util';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    console.log('🧪 Testing Meeting Email Service (SendGrid)...');

    // Initialize
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
        console.error('❌ SENDGRID_API_KEY is missing in .env');
        return;
    }
    console.log(`Debug: API Key loaded. Length: ${apiKey.length}`);
    console.log(`Debug: Starts with: ${apiKey.substring(0, 5)}...`);

    MeetingEmailUtil.initialize();

    // Mock Options
    const options = {
        to: 'Sumit <sumit@flashspace.co>', // Sending to the team email from .env as a test
        fullName: 'Test User',
        meetingDate: new Date(),
        meetLink: 'https://meet.google.com/abc-defg-hij',
        duration: 30
    };

    console.log(`\nAttempting to send email to: ${options.to}`);
    console.log(`Using Service: ${process.env.EMAIL_SERVICE}`);
    console.log(`From: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}`);

    // Send
    try {
        await MeetingEmailUtil.sendMeetingConfirmation(options);
        console.log('\n✅ Test execution completed. Check your inbox.');
    } catch (error) {
        console.error('\n❌ Test failed:', error);
    }
};

run();
