
import http from 'http';

const checkNotifications = () => {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notifications/admin',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                if (response.success && Array.isArray(response.data)) {
                    const notifications = response.data;
                    console.log(`Total Notifications: ${notifications.length}`);

                    // Group by time (minutes for easier grouping)
                    const timeGroups: { [key: string]: number } = {};
                    notifications.forEach((n: any) => {
                        const date = new Date(n.createdAt);
                        const time = date.toLocaleString();
                        timeGroups[time] = (timeGroups[time] || 0) + 1;
                    });

                    console.log('--- Breakdown by Creation Time ---');
                    Object.entries(timeGroups).forEach(([time, count]) => {
                        console.log(`${time}: ${count} notifications`);
                    });

                } else {
                    console.log('Failed to fetch/parse notifications', response);
                }
            } catch (e) {
                console.error('Error parsing response:', e);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.end();
};

checkNotifications();
