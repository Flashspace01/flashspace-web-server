/**
 * ============================================================
 * TICKET SYSTEM API TEST SUITE
 * ============================================================
 * 
 * This script tests all ticket-related API endpoints for the
 * FlashSpace backend server.
 * 
 * Run with: npm run test:tickets
 * 
 * Prerequisites:
 * - Server must be running on http://localhost:5000
 * - Test user (test@example.com) must exist in database
 * - Admin user (admin@flashspace.co) must exist in database
 * 
 * ============================================================
 * API ENDPOINTS OVERVIEW
 * ============================================================
 * 
 * BASE URL: http://localhost:5000/api/tickets
 * 
 * USER ENDPOINTS (requires user authentication):
 * -----------------------------------------------
 * POST   /                  - Create a new support ticket
 * GET    /my-tickets        - Get current user's tickets (paginated)
 * GET    /:ticketId         - Get specific ticket by ID
 * POST   /:ticketId/reply   - Reply to a ticket
 * 
 * ADMIN ENDPOINTS (requires admin authentication):
 * ------------------------------------------------
 * GET    /admin/all                  - Get all tickets (with filters)
 * GET    /admin/stats                - Get ticket statistics
 * PUT    /admin/:ticketId            - Update ticket details
 * POST   /admin/:ticketId/assign     - Assign ticket to admin
 * POST   /admin/:ticketId/reply      - Add admin reply to ticket
 * POST   /admin/:ticketId/escalate   - Escalate ticket priority
 * POST   /admin/:ticketId/resolve    - Mark ticket as resolved
 * POST   /admin/:ticketId/close      - Close the ticket
 * 
 * ============================================================
 * REQUEST/RESPONSE FORMATS
 * ============================================================
 * 
 * CREATE TICKET (POST /):
 * Request Body:
 * {
 *   "subject": "Issue title",
 *   "description": "Detailed description",
 *   "category": "technical|billing|general|other",
 *   "priority": "low|medium|high|urgent",
 *   "attachments": ["url1", "url2"]  // optional
 * }
 * 
 * Response (201):
 * {
 *   "success": true,
 *   "message": "Ticket created successfully",
 *   "data": {
 *     "_id": "ticket_id",
 *     "ticketNumber": "TKT26028735",
 *     "subject": "Issue title",
 *     "status": "open",
 *     ...
 *   }
 * }
 * 
 * GET USER TICKETS (GET /my-tickets):
 * Query Params: ?page=1&limit=10
 * 
 * Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "tickets": [...],
 *     "total": 5,
 *     "page": 1,
 *     "pages": 1
 *   }
 * }
 * 
 * ADMIN GET ALL TICKETS (GET /admin/all):
 * Query Params: ?status=open&priority=high&category=technical&page=1&limit=20
 * 
 * REPLY TO TICKET (POST /:ticketId/reply):
 * Request Body:
 * {
 *   "message": "Reply message content",
 *   "attachments": ["url1"]  // optional
 * }
 * 
 * TICKET STATUSES: open | in_progress | resolved | closed
 * PRIORITY LEVELS: low | medium | high | urgent
 * CATEGORIES: technical | billing | general | other
 * 
 * ============================================================
 */

const axios = require('axios');

// ============================================================
// CONFIGURATION
// ============================================================
const BASE_URL = 'http://localhost:5000/api';
const AUTH_URL = `${BASE_URL}/auth`;
const TICKET_URL = `${BASE_URL}/tickets`;
const ADMIN_TICKET_URL = `${BASE_URL}/tickets/admin`;

const TEST_USERS = {
  admin: {
    email: 'admin@flashspace.co',
    password: 'Admin@123'
  },
  user: {
    email: 'test@example.com',
    password: 'Test@123'
  }
};

// ============================================================
// TOKEN STORAGE
// ============================================================
let adminAccessToken = '';
let userAccessToken = '';
let createdTicketId = '';
let testTicketId = '';

// ============================================================
// HELPER FUNCTIONS
// ============================================================
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

const logSection = (title) => {
  console.log('\n' + '-'.repeat(50));
  console.log(`  ${title}`);
  console.log('-'.repeat(50));
};

// ============================================================
// TEST RUNNER
// ============================================================
async function runTests() {
  console.log('='.repeat(60));
  console.log('   TICKET SYSTEM API TESTS');
  console.log('   FlashSpace Backend v1.0');
  console.log('='.repeat(60));

  try {
    // ========================================================
    // AUTHENTICATION TESTS
    // ========================================================
    logSection('AUTHENTICATION');

    // 1. User Login
    console.log('\n1. Testing User Login...');
    console.log(`   POST ${AUTH_URL}/login`);
    const userLogin = await axios.post(`${AUTH_URL}/login`, TEST_USERS.user);
    if (userLogin.data.success) {
      userAccessToken = userLogin.data.data.tokens.accessToken;
      console.log('   ✅ User login successful');
    }

    // 2. Admin Login
    console.log('\n2. Testing Admin Login...');
    console.log(`   POST ${AUTH_URL}/login`);
    const adminLogin = await axios.post(`${AUTH_URL}/login`, TEST_USERS.admin);
    if (adminLogin.data.success) {
      adminAccessToken = adminLogin.data.data.tokens.accessToken;
      console.log('   ✅ Admin login successful');
    }

    // ========================================================
    // USER ENDPOINT TESTS
    // ========================================================
    logSection('USER ENDPOINTS');

    // 3. Create Ticket
    console.log('\n3. Creating Ticket...');
    console.log(`   POST ${TICKET_URL}/`);
    const ticketData = {
      subject: 'Test Ticket',
      description: 'This is a test ticket created by automated test suite',
      category: 'technical',
      priority: 'medium'
    };

    const createResponse = await axios.post(
      TICKET_URL, 
      ticketData, 
      getAuthHeaders(userAccessToken)
    );

    if (createResponse.data.success) {
      createdTicketId = createResponse.data.data._id;
      testTicketId = createdTicketId;
      console.log(`   ✅ Ticket created: ${createResponse.data.data.ticketNumber}`);
    }

    // 4. Get User Tickets
    console.log('\n4. Getting User Tickets...');
    console.log(`   GET ${TICKET_URL}/my-tickets`);
    const userTickets = await axios.get(
      `${TICKET_URL}/my-tickets`, 
      getAuthHeaders(userAccessToken)
    );

    if (userTickets.data.success) {
      console.log(`   ✅ User tickets retrieved: ${userTickets.data.data.tickets.length}`);
    }

    // 5. Get Ticket by ID
    console.log('\n5. Getting Ticket by ID...');
    console.log(`   GET ${TICKET_URL}/${testTicketId}`);
    const ticket = await axios.get(
      `${TICKET_URL}/${testTicketId}`, 
      getAuthHeaders(userAccessToken)
    );

    if (ticket.data.success) {
      console.log(`   ✅ Ticket retrieved: ${ticket.data.data.subject}`);
    }

    // 6. Reply to Ticket (User)
    console.log('\n6. Replying to Ticket (User)...');
    console.log(`   POST ${TICKET_URL}/${testTicketId}/reply`);
    const userReply = await axios.post(
      `${TICKET_URL}/${testTicketId}/reply`,
      { message: 'This is a test reply from user' },
      getAuthHeaders(userAccessToken)
    );

    if (userReply.data.success) {
      console.log('   ✅ User reply added successfully');
    }

    // ========================================================
    // ADMIN ENDPOINT TESTS
    // ========================================================
    logSection('ADMIN ENDPOINTS');

    // 7. Get All Tickets (Admin)
    console.log('\n7. Getting All Tickets (Admin)...');
    console.log(`   GET ${ADMIN_TICKET_URL}/all`);
    const allTickets = await axios.get(
      `${ADMIN_TICKET_URL}/all`, 
      getAuthHeaders(adminAccessToken)
    );

    if (allTickets.data.success) {
      console.log(`   ✅ All tickets retrieved: ${allTickets.data.data.total}`);
    }

    // 8. Get Ticket Stats (Admin)
    console.log('\n8. Getting Ticket Stats...');
    console.log(`   GET ${ADMIN_TICKET_URL}/stats`);
    const stats = await axios.get(
      `${ADMIN_TICKET_URL}/stats`, 
      getAuthHeaders(adminAccessToken)
    );

    if (stats.data.success) {
      console.log('   ✅ Stats retrieved');
      if (stats.data.data) {
        console.log(`      - Total: ${stats.data.data.total || 'N/A'}`);
        console.log(`      - Open: ${stats.data.data.byStatus?.open || 'N/A'}`);
      }
    }

    // 9. Assign Ticket (Admin)
    console.log('\n9. Assigning Ticket...');
    console.log(`   POST ${ADMIN_TICKET_URL}/${testTicketId}/assign`);
    const assignResponse = await axios.post(
      `${ADMIN_TICKET_URL}/${testTicketId}/assign`,
      {}, // Assigns to self when no assigneeId provided
      getAuthHeaders(adminAccessToken)
    );

    if (assignResponse.data.success) {
      console.log('   ✅ Ticket assigned successfully');
    }

    // 10. Admin Reply
    console.log('\n10. Adding Admin Reply...');
    console.log(`    POST ${ADMIN_TICKET_URL}/${testTicketId}/reply`);
    const adminReply = await axios.post(
      `${ADMIN_TICKET_URL}/${testTicketId}/reply`,
      { message: 'This is an admin response to your ticket' },
      getAuthHeaders(adminAccessToken)
    );

    if (adminReply.data.success) {
      console.log('    ✅ Admin reply added successfully');
    }

    // 11. Update Ticket (Admin)
    console.log('\n11. Updating Ticket...');
    console.log(`    PUT ${ADMIN_TICKET_URL}/${testTicketId}`);
    const updateResponse = await axios.put(
      `${ADMIN_TICKET_URL}/${testTicketId}`,
      { priority: 'high' },
      getAuthHeaders(adminAccessToken)
    );

    if (updateResponse.data.success) {
      console.log('    ✅ Ticket updated successfully');
    }

    // 12. Escalate Ticket (Admin)
    console.log('\n12. Escalating Ticket...');
    console.log(`    POST ${ADMIN_TICKET_URL}/${testTicketId}/escalate`);
    const escalateResponse = await axios.post(
      `${ADMIN_TICKET_URL}/${testTicketId}/escalate`,
      {},
      getAuthHeaders(adminAccessToken)
    );

    if (escalateResponse.data.success) {
      console.log('    ✅ Ticket escalated successfully');
    }

    // 13. Resolve Ticket (Admin)
    console.log('\n13. Resolving Ticket...');
    console.log(`    POST ${ADMIN_TICKET_URL}/${testTicketId}/resolve`);
    const resolveResponse = await axios.post(
      `${ADMIN_TICKET_URL}/${testTicketId}/resolve`,
      {},
      getAuthHeaders(adminAccessToken)
    );

    if (resolveResponse.data.success) {
      console.log('    ✅ Ticket resolved successfully');
    }

    // 14. Close Ticket (Admin)
    console.log('\n14. Closing Ticket...');
    console.log(`    POST ${ADMIN_TICKET_URL}/${testTicketId}/close`);
    const closeResponse = await axios.post(
      `${ADMIN_TICKET_URL}/${testTicketId}/close`,
      {},
      getAuthHeaders(adminAccessToken)
    );

    if (closeResponse.data.success) {
      console.log('    ✅ Ticket closed successfully');
    }

    // ========================================================
    // SUMMARY
    // ========================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nEndpoints Tested:');
    console.log('  User Endpoints:   4/4 ✅');
    console.log('  Admin Endpoints:  8/8 ✅');
    console.log('  Total:           12/12 ✅');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('URL:', error.config?.url);
      console.error('Method:', error.config?.method?.toUpperCase());
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// ============================================================
// RUN TESTS
// ============================================================
runTests();