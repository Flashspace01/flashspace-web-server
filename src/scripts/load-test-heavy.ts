
import http from 'http';

// Configuration
const TOTAL_REQUESTS = 80;
const START_HOUR_OFFSET = 24; // Start booking from 24 hours in future

const sendBookingRequest = (id: number): Promise<{ id: number, status: number, duration: number, error?: string }> => {
    return new Promise((resolve) => {
        // Calculate a unique time slot for each request to avoid "Time slot not available" errors
        // We will schedule them 30 minutes apart
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + START_HOUR_OFFSET);
        futureDate.setMinutes(futureDate.getMinutes() + (id * 30));

        // Ensure we don't land on a Sunday (weekday 0)
        if (futureDate.getDay() === 0) {
            futureDate.setDate(futureDate.getDate() + 1);
        }

        // Ensure we are within working hours (10 AM - 7 PM)
        // Reset to 10 AM if outside
        const hour = futureDate.getHours();
        if (hour < 10 || hour >= 19) {
            futureDate.setHours(10);
            futureDate.setMinutes(0);
            // Add days based on ID to spread them out if we reset time
            futureDate.setDate(futureDate.getDate() + Math.floor(id / 10));
        }

        const payload = JSON.stringify({
            fullName: `Heavy Load User ${id}`,
            email: `heavyload${id}@example.com`,
            phoneNumber: `98765432${id.toString().padStart(2, '0')}`,
            slotTime: futureDate.toISOString(),
            notes: `Heavy load test request #${id}`
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
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const duration = Date.now() - start;
                // Treat 201 (Created) and 400 (Bad Request - e.g. slot taken) as 'handled'
                // But for this test we want 201s
                const result = {
                    id,
                    status: res.statusCode || 0,
                    duration,
                    error: res.statusCode !== 201 ? data : undefined
                };
                resolve(result);
            });
        });

        req.on('error', (e) => {
            resolve({ id, status: 0, duration: Date.now() - start, error: e.message });
        });

        req.write(payload);
        req.end();
    });
};

const runHeavyLoadTest = async () => {
    console.log(`🚀 Starting HEAVY Load Test: ${TOTAL_REQUESTS} Concurrent Booking Requests`);
    console.log('------------------------------------------------');

    const promises = [];
    for (let i = 1; i <= TOTAL_REQUESTS; i++) {
        promises.push(sendBookingRequest(i));
    }

    const results = await Promise.all(promises);

    const successCount = results.filter(r => r.status === 201).length;
    const failCount = results.filter(r => r.status !== 201).length;

    console.log('------------------------------------------------');
    console.log(`🏁 Test Complete.`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);

    if (failCount > 0) {
        console.log('\nSample Failures:');
        results.filter(r => r.status !== 201).slice(0, 5).forEach(r => {
            console.log(`Request #${r.id} (${r.status}): ${r.error}`);
        });
    }

    console.log('\nCheck your Admin Dashboard. You should see a flood of notifications.');
};

runHeavyLoadTest();
