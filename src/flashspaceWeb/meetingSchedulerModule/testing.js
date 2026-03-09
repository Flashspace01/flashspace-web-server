/**
 * Meeting Scheduler API Test Script
 * Run with: node src/scripts/test-meeting-scheduler.js
 * 
 * Make sure the server is running on http://localhost:5000
 */

const BASE_URL = 'http://localhost:5000/api/meetings';

// Helper function to make requests
async function makeRequest(method, endpoint, body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        return { status: 'ERROR', error: error.message };
    }
}

// Test functions
async function testAuthStatus() {
    console.log('\n📋 Testing: GET /auth/status');
    console.log('─'.repeat(50));
    const result = await makeRequest('GET', '/auth/status');
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    return result;
}

async function testInitiateAuth() {
    console.log('\n🔐 Testing: GET /auth/google');
    console.log('─'.repeat(50));
    const result = await makeRequest('GET', '/auth/google');
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));

    if (result.data?.data?.authUrl) {
        console.log('\n👉 To authorize, open this URL in your browser:');
        console.log(result.data.data.authUrl);
    }
    return result;
}

async function testGetAvailability(days = 7) {
    console.log(`\n📅 Testing: GET /availability?days=${days}`);
    console.log('─'.repeat(50));
    const result = await makeRequest('GET', `/availability?days=${days}`);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    return result;
}

async function testBookMeeting() {
    console.log('\n📝 Testing: POST /book');
    console.log('─'.repeat(50));

    // Slot time: February 11th, 2026 at 4:00 PM IST
    const slotTime = new Date('2026-02-13T16:00:00+05:30');

    const bookingData = {
        fullName: 'Test User',
        email: 'tusharsaxena1203@gmail.com',
        phoneNumber: '+919876543210',
        slotTime: slotTime.toISOString(),
        notes: 'This is a test booking from the test script.'
    };

    console.log('Request Body:', JSON.stringify(bookingData, null, 2));
    const result = await makeRequest('POST', '/book', bookingData);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    return result;
}

async function testGetMeetingDetails(meetingId) {
    console.log(`\n🔍 Testing: GET /meeting/${meetingId}`);
    console.log('─'.repeat(50));
    const result = await makeRequest('GET', `/meeting/${meetingId}`);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    return result;
}

async function testInvalidMeetingId() {
    console.log('\n❌ Testing: GET /meeting/invalid-id (Error Case)');
    console.log('─'.repeat(50));
    const result = await makeRequest('GET', '/meeting/invalid-id');
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    return result;
}

async function testMissingFields() {
    console.log('\n❌ Testing: POST /book with missing fields (Error Case)');
    console.log('─'.repeat(50));
    const result = await makeRequest('POST', '/book', { fullName: 'Only Name' });
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    return result;
}

async function testRevokeAuth() {
    console.log('\n🚫 Testing: DELETE /auth/google');
    console.log('─'.repeat(50));
    const result = await makeRequest('DELETE', '/auth/google');
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    return result;
}

// Main test runner
async function runTests() {
    console.log('='.repeat(60));
    console.log('  MEETING SCHEDULER API TESTS');
    console.log('  Server: ' + BASE_URL);
    console.log('='.repeat(60));

    // 1. Check auth status
    await testAuthStatus();

    // 2. Get auth URL
    await testInitiateAuth();

    // 3. Get availability
    await testGetAvailability(7);

    // 4. Book a meeting
    const bookingResult = await testBookMeeting();

    // 5. Get meeting details (if booking succeeded)
    if (bookingResult.data?.data?._id) {
        await testGetMeetingDetails(bookingResult.data.data._id);
    }

    // 6. Test error cases
    await testInvalidMeetingId();
    await testMissingFields();

    // Uncomment to test revoke (will remove saved tokens)
    // await testRevokeAuth();

    console.log('\n' + '='.repeat(60));
    console.log('  TESTS COMPLETE');
    console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);
