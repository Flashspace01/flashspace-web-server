
import http from 'http';

const sendBookingRequest = (id: number): Promise<void> => {
    return new Promise((resolve) => {
        const payload = JSON.stringify({
            fullName: `Load Test User ${id}`,
            email: `loadtest${id}@example.com`,
            phoneNumber: `123456789${id}`,
            slotTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
            notes: `Simulated concurrent request #${id}`
        });

        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/meetings/book',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        };

        const start = Date.now();
        const req = http.request(options, (res) => {
            const duration = Date.now() - start;
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✅ Request #${id} success: ${res.statusCode} (${duration}ms)`);
                } else {
                    console.log(`❌ Request #${id} failed: ${res.statusCode} (${duration}ms)`);
                    console.log(`   Error: ${data}`);
                }
                resolve();
            });
        });

        req.on('error', (error) => {
            const duration = Date.now() - start;
            console.error(`❌ Request #${id} error: ${error.message} (${duration}ms)`);
            resolve();
        });

        req.write(payload);
        req.end();
    });
};

const runLoadTest = async () => {
    console.log('🚀 Starting Load Test: 7 Concurrent Booking Requests');
    console.log('------------------------------------------------');

    const requests = [];
    for (let i = 1; i <= 7; i++) {
        requests.push(sendBookingRequest(i));
    }

    await Promise.all(requests);

    console.log('------------------------------------------------');
    console.log('🏁 Load Test Complete');
    console.log('Check your Admin Dashboard Notifications to see the results.');
};

runLoadTest();
