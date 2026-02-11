// src/scripts/rbac-security-test-fixed.ts
/**
 * ============================================================================
 * RBAC SECURITY TEST SUITE (FIXED VERSION)
 * ============================================================================
 * 
 * CHANGES MADE:
 * 1. Uses cookies instead of Authorization header
 * 2. Fixed dashboard permissions
 * 3. Added debug logging
 * 
 * QUICK START:
 * 1. Start backend:        npm run dev
 * 2. Setup users:          npm run setup:users
 * 3. Run tests:            npm run test:rbac
 * 
 * ⚠️  IMPORTANT: Do NOT deploy to production until all tests pass!
 * ============================================================================
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import * as https from 'https';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
console.log(`📁 Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';
console.log(`🌐 Base URL: ${BASE_URL}`);

// Test users for different roles
const TEST_USERS = {
    admin: {
        email: 'admin@flashspace.com',
        password: 'Admin@123',
        role: 'admin'
    },
    partner: {
        email: 'partner@flashspace.com',
        password: 'Partner@123',
        role: 'partner'
    },
    sales: {
        email: 'sales@flashspace.com',
        password: 'Sales@123',
        role: 'sales'
    },
    user: {
        email: 'user@flashspace.com',
        password: 'User@123',
        role: 'user'
    }
};

// Create axios instance with cookie support
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000, // Increased timeout
    withCredentials: true, // IMPORTANT: Send cookies
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    httpsAgent: new https.Agent({
        rejectUnauthorized: false // For development only
    })
});

interface TestResult {
    name: string;
    passed: boolean;
    message?: string;
    expected?: string;
    actual?: string;
}

interface UserTokens {
    admin?: string;
    partner?: string;
    sales?: string;
    user?: string;
}

const tokens: UserTokens = {};
const cookies: { [key: string]: string[] } = {};

// ============ HELPER FUNCTIONS ============

async function runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    try {
        console.log(`🧪 ${testName}...`);
        const result = await testFn();
        console.log(`✅ ${testName} - PASSED`);
        return { name: testName, passed: true };
    } catch (error: any) {
        const statusCode = error.response?.status;
        const message = error.response?.data?.message || error.message;
        console.error(`❌ ${testName} - FAILED: ${message} (${statusCode})`);
        return {
            name: testName,
            passed: false,
            message: `${message} (Status: ${statusCode})`,
            actual: `${statusCode}`
        };
    }
}

async function expectSuccess(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    try {
        console.log(`🧪 ${testName}...`);
        const result = await testFn();
        if (result.status >= 200 && result.status < 300) {
            console.log(`✅ ${testName} - PASSED (${result.status})`);
            return { name: testName, passed: true, expected: '2xx', actual: `${result.status}` };
        } else {
            console.error(`❌ ${testName} - FAILED: Unexpected status ${result.status}`);
            return { name: testName, passed: false, expected: '2xx', actual: `${result.status}` };
        }
    } catch (error: any) {
        const statusCode = error.response?.status;
        const message = error.response?.data?.message || error.message;
        console.error(`❌ ${testName} - FAILED: ${message} (${statusCode})`);
        return { name: testName, passed: false, expected: '2xx', actual: `${statusCode}` };
    }
}

async function expectForbidden(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    try {
        console.log(`🧪 ${testName}...`);
        const result = await testFn();
        console.error(`❌ ${testName} - FAILED: Expected 403, got ${result.status}`);
        return { name: testName, passed: false, expected: '403', actual: `${result.status}` };
    } catch (error: any) {
        const statusCode = error.response?.status;
        if (statusCode === 403) {
            console.log(`✅ ${testName} - PASSED (Correctly blocked with 403)`);
            return { name: testName, passed: true, expected: '403', actual: '403' };
        } else {
            const message = error.response?.data?.message || error.message;
            console.error(`❌ ${testName} - FAILED: Expected 403, got ${statusCode} - ${message}`);
            return { name: testName, passed: false, expected: '403', actual: `${statusCode}` };
        }
    }
}

async function expectUnauthorized(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    try {
        console.log(`🧪 ${testName}...`);
        const result = await testFn();
        console.error(`❌ ${testName} - FAILED: Expected 401, got ${result.status}`);
        return { name: testName, passed: false, expected: '401', actual: `${result.status}` };
    } catch (error: any) {
        const statusCode = error.response?.status;
        if (statusCode === 401) {
            console.log(`✅ ${testName} - PASSED (Correctly blocked with 401)`);
            return { name: testName, passed: true, expected: '401', actual: '401' };
        } else {
            const message = error.response?.data?.message || error.message;
            console.error(`❌ ${testName} - FAILED: Expected 401, got ${statusCode} - ${message}`);
            return { name: testName, passed: false, expected: '401', actual: `${statusCode}` };
        }
    }
}

// ============ SETUP: LOGIN TEST USERS ============

async function loginTestUsers() {
    console.log('\n🔧 SETUP: Logging in Test Users');
    console.log('================================');

    const results: TestResult[] = [];

    for (const [roleName, userData] of Object.entries(TEST_USERS)) {
        results.push(await runTest(`Login ${roleName} user`, async () => {
            try {
                console.log(`   Attempting login for ${userData.email}...`);

                // Login to get cookies
                const loginResponse = await api.post('/auth/login', {
                    email: userData.email,
                    password: userData.password
                });

                // Store cookies for this user
                const setCookieHeaders = loginResponse.headers['set-cookie'];
                if (setCookieHeaders) {
                    cookies[roleName] = setCookieHeaders;
                    console.log(`   🍪 Cookies obtained for ${roleName}`);
                } else {
                    console.log(`   ⚠️  No cookies received for ${roleName}`);
                }

                // Also store token for debugging
                if (loginResponse.data.data?.tokens?.accessToken) {
                    tokens[roleName as keyof UserTokens] = loginResponse.data.data.tokens.accessToken;
                    console.log(`   🔑 Token obtained for ${roleName}`);
                }

                console.log(`   ✅ ${roleName} login successful`);
                return loginResponse.data;
            } catch (error: any) {
                console.error(`   ❌ ${roleName} login failed:`, error.response?.data || error.message);
                if (error.response?.status === 401) {
                    console.log(`   ⚠️  ${roleName} login failed - user may not exist or wrong password`);
                    console.log(`   ⚠️  Run: npm run setup:users to create test users`);
                }
                throw error;
            }
        }));
    }

    return results;
}

// Helper to get axios config with cookies for a specific role
function getConfigForRole(roleName: keyof typeof TEST_USERS) {
    const roleCookies = cookies[roleName];
    const config: any = {
        withCredentials: true
    };

    if (roleCookies && roleCookies.length > 0) {
        // Extract just the cookie values
        const cookieString = roleCookies
            .map(cookie => cookie.split(';')[0]) // Get cookie pair
            .join('; ');

        config.headers = {
            Cookie: cookieString
        };
    }

    return config;
}

// ============ TEST 1: AUTHENTICATION TESTS ============

async function testAuthentication() {
    console.log('\n🔐 TEST 1: Authentication & Authorization');
    console.log('=========================================');

    const results: TestResult[] = [];

    // Test 1.1: Unauthenticated access should fail
    results.push(await expectUnauthorized('Unauthenticated access to dashboard', async () => {
        return await api.get('/admin/dashboard');
    }));

    // Test 1.2: Invalid token should fail
    results.push(await expectUnauthorized('Invalid cookie access', async () => {
        return await api.get('/admin/dashboard', {
            headers: {
                Cookie: 'accessToken=invalid_token_12345'
            }
        });
    }));

    // Test 1.3: Valid user can access own profile
    results.push(await expectSuccess('User access to own profile', async () => {
        const config = getConfigForRole('user');
        return await api.get('/auth/profile', config);
    }));

    return results;
}

// ============ TEST 2: ADMIN PERMISSIONS ============

async function testAdminPermissions() {
    console.log('\n👑 TEST 2: Admin Permissions (MANAGE_ALL_USERS, MANAGE_SYSTEM)');
    console.log('===============================================================');

    const results: TestResult[] = [];

    // Test 2.1: Admin can access dashboard
    results.push(await expectSuccess('Admin access to dashboard', async () => {
        const config = getConfigForRole('admin');
        return await api.get('/admin/dashboard', config);
    }));

    // Test 2.2: Admin can access user management
    results.push(await expectSuccess('Admin access to user list', async () => {
        const config = getConfigForRole('admin');
        return await api.get('/admin/users', config);
    }));

    // Test 2.3: Admin can access all bookings
    results.push(await expectSuccess('Admin access to all bookings', async () => {
        const config = getConfigForRole('admin');
        return await api.get('/admin/bookings', config);
    }));

    // Test 2.4: Admin can access KYC management
    results.push(await expectSuccess('Admin access to pending KYC', async () => {
        const config = getConfigForRole('admin');
        return await api.get('/admin/kyc/pending', config);
    }));

    return results;
}

// ============ TEST 3: PARTNER PERMISSIONS ============

async function testPartnerPermissions() {
    console.log('\n🤝 TEST 3: Partner Permissions (MANAGE_OWN_SPACES, VIEW_OWN_BOOKINGS)');
    console.log('======================================================================');

    const results: TestResult[] = [];

    // Test 3.1: Partner can access dashboard
    results.push(await expectSuccess('Partner access to dashboard', async () => {
        const config = getConfigForRole('partner');
        return await api.get('/admin/dashboard', config);
    }));

    // Test 3.2: Partner CANNOT access user management
    results.push(await expectForbidden('Partner blocked from user management', async () => {
        const config = getConfigForRole('partner');
        return await api.get('/admin/users', config);
    }));

    // Test 3.3: Partner can access bookings (scoped to own)
    results.push(await expectSuccess('Partner access to bookings', async () => {
        const config = getConfigForRole('partner');
        return await api.get('/admin/bookings', config);
    }));

    // Test 3.4: Partner can access KYC (for own spaces)
    results.push(await expectSuccess('Partner access to KYC', async () => {
        const config = getConfigForRole('partner');
        return await api.get('/admin/kyc/pending', config);
    }));

    return results;
}

// ============ TEST 4: SALES PERMISSIONS ============

async function testSalesPermissions() {
    console.log('\n💼 TEST 4: Sales Permissions (VIEW_ALL_SPACES, MANAGE_LEADS)');
    console.log('============================================================');

    const results: TestResult[] = [];

    // Test 4.1: Sales can access dashboard
    results.push(await expectSuccess('Sales access to dashboard', async () => {
        const config = getConfigForRole('sales');
        return await api.get('/admin/dashboard', config);
    }));

    // Test 4.2: Sales CANNOT access user management
    results.push(await expectForbidden('Sales blocked from user management', async () => {
        const config = getConfigForRole('sales');
        return await api.get('/admin/users', config);
    }));

    // Test 4.3: Sales can view all bookings
    results.push(await expectSuccess('Sales access to all bookings', async () => {
        const config = getConfigForRole('sales');
        return await api.get('/admin/bookings', config);
    }));

    // Test 4.4: Sales CANNOT access KYC management
    results.push(await expectForbidden('Sales blocked from KYC management', async () => {
        const config = getConfigForRole('sales');
        return await api.get('/admin/kyc/pending', config);
    }));

    return results;
}

// ============ TEST 5: REGULAR USER PERMISSIONS ============

async function testUserPermissions() {
    console.log('\n👤 TEST 5: Regular User Permissions (No Admin Access)');
    console.log('=====================================================');

    const results: TestResult[] = [];

    // Test 5.1: User CANNOT access admin dashboard
    results.push(await expectForbidden('User blocked from admin dashboard', async () => {
        const config = getConfigForRole('user');
        return await api.get('/admin/dashboard', config);
    }));

    // Test 5.2: User CANNOT access user management
    results.push(await expectForbidden('User blocked from user management', async () => {
        const config = getConfigForRole('user');
        return await api.get('/admin/users', config);
    }));

    // Test 5.3: User CANNOT access admin bookings
    results.push(await expectForbidden('User blocked from admin bookings', async () => {
        const config = getConfigForRole('user');
        return await api.get('/admin/bookings', config);
    }));

    // Test 5.4: User CAN access their own dashboard
    results.push(await expectSuccess('User access to own dashboard', async () => {
        const config = getConfigForRole('user');
        return await api.get('/user/dashboard', config);
    }));

    return results;
}

// ============ TEST 6: CROSS-ROLE SECURITY ============

async function testCrossRoleSecurity() {
    console.log('\n🔒 TEST 6: Cross-Role Security (Privilege Escalation Prevention)');
    console.log('=================================================================');

    const results: TestResult[] = [];

    // Test 6.1: Partner cannot delete users
    results.push(await expectForbidden('Partner blocked from deleting users', async () => {
        const config = getConfigForRole('partner');
        return await api.delete('/admin/users/fake-user-id', config);
    }));

    // Test 6.2: Sales cannot modify KYC
    results.push(await expectForbidden('Sales blocked from KYC review', async () => {
        const config = getConfigForRole('sales');
        return await api.put('/admin/kyc/fake-kyc-id/review', {
            action: 'approve'
        }, config);
    }));

    // Test 6.3: User cannot access admin user list
    results.push(await expectForbidden('User blocked from admin user list', async () => {
        const config = getConfigForRole('user');
        return await api.get('/admin/users', config);
    }));

    return results;
}

// ============ MAIN TEST RUNNER ============

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 FLASHSPACE RBAC SECURITY TEST SUITE (FIXED)');
    console.log('='.repeat(60));
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log('='.repeat(60) + '\n');

    const allResults: TestResult[] = [];

    try {
        // Step 1: Login all test users
        console.log('📋 Step 1: Logging in test users...\n');
        const loginResults = await loginTestUsers();
        allResults.push(...loginResults);

        // Check if any logins failed
        const failedLogins = loginResults.filter(r => !r.passed);
        if (failedLogins.length > 0) {
            console.log('\n⚠️  Some users failed to login. Cannot run full test suite.');
            console.log('   Please ensure test users exist with correct passwords.');
            console.log('   Run: npm run setup:users\n');

            printSecurityReport(allResults);
            return;
        }

        console.log('\n✅ All test users logged in successfully!\n');

        // Brief pause
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Run all security tests
        console.log('📋 Step 2: Running security tests...\n');
        allResults.push(...await testAuthentication());
        allResults.push(...await testAdminPermissions());
        allResults.push(...await testPartnerPermissions());
        allResults.push(...await testSalesPermissions());
        allResults.push(...await testUserPermissions());
        allResults.push(...await testCrossRoleSecurity());

    } catch (error: any) {
        console.error('❌ Test suite crashed:', error.message);
        console.error(error.stack);
    }

    // Print comprehensive security report
    printSecurityReport(allResults);
}

function printSecurityReport(results: TestResult[]) {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 RBAC SECURITY TEST REPORT');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    console.log(`✅ Tests Passed: ${passed}`);
    console.log(`❌ Tests Failed: ${failed}`);
    console.log(`📈 Total Tests: ${total}`);
    console.log(`🎯 Success Rate: ${successRate}%`);

    // Security status
    console.log('\n🔒 SECURITY STATUS:');
    console.log('-'.repeat(40));

    if (successRate === 100) {
        console.log('✅ SECURE - All permission checks passed');
        console.log('✅ No unauthorized access detected');
        console.log('✅ Role-based access control working correctly');
    } else if (successRate >= 80) {
        console.log('⚠️  MOSTLY SECURE - Some issues detected');
        console.log('⚠️  Review failed tests below');
    } else {
        console.log('❌ INSECURE - Critical security issues detected');
        console.log('❌ IMMEDIATE ACTION REQUIRED');
    }

    // List failed tests (security vulnerabilities)
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
        console.log('\n🚨 SECURITY VULNERABILITIES DETECTED:');
        console.log('-'.repeat(40));
        failedTests.forEach((test, index) => {
            console.log(`${index + 1}. ${test.name}`);
            if (test.message) console.log(`   Issue: ${test.message}`);
            if (test.expected && test.actual) {
                console.log(`   Expected: ${test.expected}, Got: ${test.actual}`);
            }
        });

        console.log('\n💡 TROUBLESHOOTING GUIDE:');
        console.log('1. Check if test users have correct roles in database');
        console.log('2. Verify RBAC middleware is applied to all admin routes');
        console.log('3. Check backend logs for RBAC debug messages');
        console.log('4. Ensure permissions.config.ts has correct permissions');
        console.log('5. Make sure you updated the files as shown in previous instructions');
        console.log('6. DO NOT DEPLOY TO PRODUCTION until all tests pass');

        process.exit(1);
    } else {
        console.log('\n' + '🎉'.repeat(15));
        console.log('🎉 ALL SECURITY TESTS PASSED! 🎉');
        console.log('🎉'.repeat(15));

        console.log('\n✅ RBAC SYSTEM: FULLY SECURE');
        console.log('✅ PERMISSIONS: CORRECTLY ENFORCED');
        console.log('✅ UNAUTHORIZED ACCESS: BLOCKED');
        console.log('✅ PRIVILEGE ESCALATION: PREVENTED');

        console.log('\n🚀 Your RBAC system is production-ready!');

        process.exit(0);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
    process.exit(1);
});

// Run the tests
main();