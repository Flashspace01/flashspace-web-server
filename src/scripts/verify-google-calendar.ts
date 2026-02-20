import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';
import { GoogleCalendarService } from '../flashspaceWeb/meetingSchedulerModule/googleCalendar.service';

// Load environment variables
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

async function verifyGoogleCalendar() {
    console.log('\n--- Google Calendar Verification Tool ---\n');

    // 1. Check Configuration
    if (!GoogleCalendarService.isConfigured()) {
        console.error('❌ Configuration missing! Please check .env for MEETING_SCHEDULER_GOOGLE_CLIENT_ID and MEETING_SCHEDULER_GOOGLE_CLIENT_SECRET');
        process.exit(1);
    }
    console.log('✅ Configuration found.');

    // 2. Check Authorization
    if (!GoogleCalendarService.isAuthorized()) {
        console.log('\n⚠️ No existing tokens found. Initialization required.');
        const authUrl = GoogleCalendarService.getAuthUrl();
        console.log('\nPlease visit this URL to authorize the application:\n');
        console.log(authUrl);
        console.log('\n');

        const code = await askQuestion('Enter the code from the page here: ');

        try {
            await GoogleCalendarService.handleCallback(code);
            console.log('✅ Authorization successful!');
        } catch (error) {
            console.error('❌ Authorization failed:', error);
            process.exit(1);
        }
    } else {
        console.log('✅ Existing tokens found.');
    }

    // 3. Verify API Access
    console.log('\nAttempting to list upcoming events...');
    try {
        const events = await GoogleCalendarService.listUpcomingEvents(3);
        console.log('\n🎉 SUCCESS! Google Calendar API access is working.');
        console.log(`Found ${events.length} upcoming events.`);
        if (events.length > 0) {
            console.log('Next event:', events[0].summary, 'at', events[0].start.dateTime || events[0].start.date);
        }
    } catch (error: any) {
        console.error('\n❌ FAILED to list events.');
        console.error('Error details:', error.message);

        if (error.code === 403) {
            console.error('Tip: Check if the Google Calendar API is enabled in your Google Cloud Console.');
        } else if (error.code === 401) {
            console.error('Tip: Authorization might be invalid. Try removing src/flashspaceWeb/meetingSchedulerModule/google-tokens.json and running this script again.');
        }
    }

    rl.close();
}

verifyGoogleCalendar().catch(console.error);
