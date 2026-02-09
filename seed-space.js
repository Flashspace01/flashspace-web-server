
const http = require('http');

const data = JSON.stringify({
    name: "Test Office",
    description: "A seeded test space",
    category: "Private Office",
    capacity: 4,
    location: {
        address: "123 Seed St",
        city: "Test City",
        state: "TS",
        country: "USA",
        zipCode: "12345"
    },
    pricing: [{
        type: "monthly",
        amount: 500
    }]
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/spacePartner/spaces',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
