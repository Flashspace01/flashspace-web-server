// Simple API test script for Affiliate Portal module
// Usage:
//   API_BASE=http://localhost:5000/api/affiliate AUTH_TOKEN=<Bearer token> node tests/affiliatePortalApiTest.js
// If your token is a bearer token without the word 'Bearer', set AUTH_TOKEN to the raw token and the script will prefix with 'Bearer '

const API_BASE = process.env.API_BASE || "http://localhost:3000/api/affiliate";
const AUTH_URL = "http://localhost:3000/api/auth/login";

let AUTH_TOKEN = process.env.AUTH_TOKEN;

const headers = {
    "Content-Type": "application/json",
};

async function login() {
    console.log("🔐 Logging in as test affiliate...");
    try {
        const res = await fetch(AUTH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "affiliate@flashspace.com",
                password: "Flash@1234"
            })
        });
        const data = await res.json();
        if (data.success && data.data?.tokens?.accessToken) {
            AUTH_TOKEN = `Bearer ${data.data.tokens.accessToken}`;
            headers.Authorization = AUTH_TOKEN;
            console.log("✔ Login successful");
        } else {
            console.error("✖ Login failed:", data);
            process.exit(1);
        }
    } catch (err) {
        console.error("✖ Login error:", err.message);
        process.exit(1);
    }
}

function assert(condition, message) {
    if (!condition) {
        console.error("✖", message);
        process.exitCode = 1;
    } else {
        console.log("✔", message);
    }
}

async function request(method, path, body) {
    const url = `${API_BASE}${path}`;
    try {
        const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        let json = null;
        try {
            json = JSON.parse(text);
        } catch (e) {
            json = text;
        }
        return { status: res.status, body: json };
    } catch (err) {
        console.error("Request error", method, url, err.message || err);
        return { status: 0, body: null };
    }
}

async function run() {
    await login();

    console.log("API Base:", API_BASE);
    if (!AUTH_TOKEN)
        console.warn(
            "Warning: No AUTH_TOKEN provided — endpoints requiring auth will fail",
        );

    // 1) Leads flow
    console.log("\n-- Leads flow");
    const leadPayload = {
        name: "Test Lead",
        phone: "+91 90000 00000",
        email: "test.lead@example.com",
        company: "TestCo",
        interest: "Virtual Office",
    };

    const createLead = await request("POST", "/leads", leadPayload);
    assert(createLead.status === 201, "Create lead (201 expected)");
    const leadId =
        createLead.body?.data?.id ||
        createLead.body?.data?._id ||
        createLead.body?.data;

    const listLeads = await request("GET", "/leads");
    assert(listLeads.status === 200, "Get leads (200 expected)");

    if (leadId) {
        const getLead = await request("GET", `/leads/${leadId}`);
        assert(getLead.status === 200, "Get lead by id (200 expected)");

        const updateLead = await request("PUT", `/leads/${leadId}`, {
            status: "Converted",
        });
        assert(updateLead.status === 200, "Update lead (200 expected)");

        const deleteLead = await request("DELETE", `/leads/${leadId}`);
        assert(deleteLead.status === 200, "Delete lead (200 expected)");
    } else {
        console.warn(
            "Skipping individual lead GET/PUT/DELETE because lead id not returned.",
        );
    }

    // 2) Quotations flow
    console.log("\n-- Quotations flow");
    const quotationPayload = {
        clientDetails: {
            name: "Client One",
            email: "client1@example.com",
            phone: "+91 90000 11111",
            companyName: "ClientCo",
        },
        spaceRequirements: {
            spaceType: "Private Office",
            city: "Bangalore",
            location: "Koramangala",
            numberOfSeats: 5,
            duration: "6 months",
            startDate: new Date().toISOString(),
        },
        additionalNotes: "Test quotation",
        price: 50000,
    };

    const createQuote = await request("POST", "/quotations", quotationPayload);
    assert(createQuote.status === 201, "Create quotation (201 expected)");
    const quoteId =
        createQuote.body?.data?.quotationId || createQuote.body?.data?._id;

    const recent = await request("GET", "/quotations/recent");
    assert(recent.status === 200, "Get recent quotations (200 expected)");

    const stats = await request("GET", "/quotations/stats");
    assert(stats.status === 200, "Get quotation stats (200 expected)");

    // 3) Support flow
    console.log("\n-- Support flow");
    const ticketPayload = {
        subject: "Test ticket from API script",
        priority: "medium",
        message: "This is a test ticket created by automated API script",
    };

    const createTicket = await request(
        "POST",
        "/support/tickets",
        ticketPayload,
    );
    if (createTicket.status !== 201) {
        console.error("Create Ticket Failed:", JSON.stringify(createTicket.body, null, 2));
    }
    assert(createTicket.status === 201, "Create support ticket (201 expected)");
    const ticketId =
        createTicket.body?.data?.ticketId || createTicket.body?.data?._id;

    const getTickets = await request("GET", "/support/tickets");
    assert(getTickets.status === 200, "Get support tickets (200 expected)");

    const chat = await request("POST", "/support/chat", {
        message: "Hello affiliate support",
    });
    assert(chat.status === 200, "Support chat (200 expected)");

    // 4) Leaderboard
    console.log("\n-- Leaderboard");
    const leaderboard = await request("GET", "/leaderboard");
    assert(leaderboard.status === 200, "Get leaderboard (200 expected)");

    // 5) Dashboard
    console.log("\n-- Dashboard");
    const statsRes = await request("GET", "/dashboard/stats");
    assert(statsRes.status === 200, "Get dashboard stats (200 expected)");

    const insightsRes = await request("GET", "/dashboard/insights");
    assert(insightsRes.status === 200, "Get dashboard insights (200 expected)");

    console.log(
        "\nAPI test script finished. Check above assertions for any failures.",
    );
}

run().catch((err) => {
    console.error("Fatal error running tests", err);
    process.exit(1);
});
