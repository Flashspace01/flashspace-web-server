
import http from 'http';

const clearNotifications = () => {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notifications/admin',
        method: 'GET' // First get all IDs
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const response = JSON.parse(data);
            if (response.success && response.data.length > 0) {
                console.log(`Found ${response.data.length} notifications. Deleting...`);

                // Delete each one
                response.data.forEach((n: any) => {
                    const delReq = http.request({
                        hostname: 'localhost',
                        port: 5000,
                        path: `/api/notifications/${n._id}`,
                        method: 'DELETE'
                    }, (delRes) => {
                        // concise output
                    });
                    delReq.end();
                });
                console.log('All delete requests sent.');
            } else {
                console.log('No notifications to clear.');
            }
        });
    });
    req.end();
};

clearNotifications();
