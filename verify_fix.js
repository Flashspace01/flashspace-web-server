const http = require('http');

const data = JSON.stringify({
    name: 'Test Space',
    description: 'Test Description'
});

const options = {
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/spacePartner/spaces',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    let body = '';
    res.on('data', d => {
        body += d;
    });
    res.on('end', () => {
        console.log('Response:', body);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
