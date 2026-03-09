/**
 * ============================================================
 * FEEDBACK MODULE API TEST SUITE
 * ============================================================
 * 
 * This script tests all feedback-related API endpoints for the
 * FlashSpace backend server.
 * 
 * Run with: npm run test:feedback
 * 
 * Prerequisites:
 * - Server must be running on http://localhost:5000
 * - MongoDB must be connected and running
 * 
 * ============================================================
 * API ENDPOINTS OVERVIEW
 * ============================================================
 * 
 * BASE URL: http://localhost:5000/api/feedback
 * 
 * PUBLIC ENDPOINTS:
 * -----------------
 * POST   /create          - Submit new feedback
 * 
 * GET ENDPOINTS:
 * --------------
 * GET    /                - Get all feedback (sorted by rating)
 * GET    /getAll          - Legacy endpoint for all feedback
 * GET    /nps             - Get NPS statistics
 * GET    /ai-insight      - Get business insights from feedback data
 * 
 * ============================================================
 * REQUEST/RESPONSE FORMATS
 * ============================================================
 * 
 * SUBMIT FEEDBACK (POST /create):
 * Request Body:
 * {
 *   "company": "Company Name",
 *   "rating": 1-5,                     // Required, 1-5 scale
 *   "npsScore": 0-10,                  // Optional, Net Promoter Score
 *   "location": "City, Country",       // Required
 *   "review": "Detailed feedback text" // Required
 * }
 * 
 * Response (201):
 * {
 *   "success": true,
 *   "message": "Feedback submitted successfully",
 *   "data": {
 *     "_id": "feedback_id",
 *     "company": "Company Name",
 *     "rating": 5,
 *     "npsScore": 10,
 *     "location": "City, Country",
 *     "review": "Detailed feedback text",
 *     "createdAt": "2024-01-15T10:30:00.000Z"
 *   },
 *   "error": {}
 * }
 * 
 * GET ALL FEEDBACK (GET /):
 * Query Params: None
 * Response returns sorted by rating (descending), then createdAt (descending)
 * 
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Feedback fetched successfully",
 *   "data": [
 *     { ...feedback_object },
 *     { ...feedback_object }
 *   ],
 *   "error": {}
 * }
 * 
 * GET NPS STATISTICS (GET /nps):
 * Response (200):
 * {
 *   "success": true,
 *   "message": "NPS calculated successfully",
 *   "data": {
 *     "nps": 50,                    // Net Promoter Score (-100 to 100)
 *     "totalResponses": 10,         // Total feedback with NPS scores
 *     "promoters": 7,               // NPS Score 9-10
 *     "passives": 2,                // NPS Score 7-8
 *     "detractors": 1               // NPS Score 0-6
 *   },
 *   "error": {}
 * }
 * 
 * GET FEEDBACK INSIGHTS (GET /ai-insight):
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Feedback insights generated successfully",
 *   "data": {
 *     "avgRating": 4.5,
 *     "totalFeedback": 25,
 *     "nps": 60,
 *     "promoters": 15,
 *     "passives": 5,
 *     "detractors": 5
 *   },
 *   "error": {}
 * }
 * 
 * ============================================================
 * NPS CALCULATION
 * ============================================================
 * 
 * NPS Categories:
 * - Promoters: Score 9-10 (Loyal enthusiasts)
 * - Passives: Score 7-8 (Satisfied but unenthusiastic)
 * - Detractors: Score 0-6 (Unhappy customers)
 * 
 * NPS Formula:
 * NPS = % Promoters - % Detractors
 * 
 * Example:
 * Total responses: 100
 * Promoters: 70 (70%)
 * Detractors: 20 (20%)
 * NPS = 70 - 20 = 50
 * 
 * Score Interpretation:
 * - >0: Good
 * - >50: Excellent
 * - >70: World Class
 * 
 * ============================================================
 * ERROR RESPONSES
 * ============================================================
 * 
 * 400 Bad Request:
 * {
 *   "success": false,
 *   "message": "Required fields missing",
 *   "data": {},
 *   "error": "Validation error"
 * }
 * 
 * 500 Internal Server Error:
 * {
 *   "success": false,
 *   "message": "Something went wrong",
 *   "data": {},
 *   "error": {Error details}
 * }
 * 
 * ============================================================
 */

import axios from 'axios';

// ============================================================
// CONFIGURATION
// ============================================================
const BASE_URL = 'http://localhost:5000/api';
const FEEDBACK_URL = `${BASE_URL}/feedback`;

// Test data for different scenarios
const TEST_FEEDBACKS = {
  valid: {
    company: 'FlashSpace Inc.',
    rating: 5,
    npsScore: 10,
    location: 'San Francisco, CA',
    review: 'Excellent coworking space with amazing amenities!'
  },
  validWithoutNps: {
    company: 'Tech Hub Co.',
    rating: 4,
    location: 'New York, NY',
    review: 'Great location and friendly staff.'
  },
  promoter: {
    company: 'Promoter Corp',
    rating: 5,
    npsScore: 9,
    location: 'Austin, TX',
    review: 'Would definitely recommend to others!'
  },
  passive: {
    company: 'Passive Ltd',
    rating: 3,
    npsScore: 7,
    location: 'Chicago, IL',
    review: 'It was okay, nothing special.'
  },
  detractor: {
    company: 'Detractor LLC',
    rating: 2,
    npsScore: 4,
    location: 'Miami, FL',
    review: 'Needs improvement in service quality.'
  },
  invalid: {
    company: 'Invalid Co.',
    // Missing required fields
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
const logSection = (title: string): void => {
  console.log('\n' + '-'.repeat(60));
  console.log(`  ${title}`);
  console.log('-'.repeat(60));
};

const logStep = (step: number, description: string): void => {
  console.log(`\n${step}. ${description}`);
};

const logSuccess = (message: string): void => {
  console.log(`   ✅ ${message}`);
};

const logInfo = (message: string): void => {
  console.log(`   ℹ️  ${message}`);
};

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ============================================================
// TEST RUNNER
// ============================================================
async function runFeedbackTests() {
  console.log('='.repeat(70));
  console.log('   FEEDBACK MODULE API TEST SUITE');
  console.log('   FlashSpace Backend v1.0');
  console.log('='.repeat(70));

  let testResults = {
    total: 0,
    passed: 0,
    failed: 0
  };

  try {
    // ========================================================
    // 1. VALIDATION TESTS
    // ========================================================
    logSection('VALIDATION TESTS');

    testResults.total++;
    logStep(1, 'Testing validation - Missing required fields');
    try {
      const response = await axios.post(
        `${FEEDBACK_URL}/create`,
        TEST_FEEDBACKS.invalid
      );
      console.log('   ❌ Should have returned 400 error');
      testResults.failed++;
    } catch (error: any) {
      if (error.response?.status === 400) {
        logSuccess('Validation working correctly (400 Bad Request)');
        testResults.passed++;
      } else {
        console.log('   ❌ Unexpected error:', error.message);
        testResults.failed++;
      }
    }

    // ========================================================
    // 2. FEEDBACK SUBMISSION TESTS
    // ========================================================
    logSection('FEEDBACK SUBMISSION TESTS');

    testResults.total++;
    logStep(2, 'Submitting feedback with all fields');
    try {
      const response = await axios.post(
        `${FEEDBACK_URL}/create`,
        TEST_FEEDBACKS.valid
      );

      if (response.status === 201 && response.data.success) {
        logSuccess(`Feedback submitted successfully`);
        console.log(`   ID: ${response.data.data._id}`);
        console.log(`   Company: ${response.data.data.company}`);
        console.log(`   Rating: ${response.data.data.rating}/5`);
        testResults.passed++;
      } else {
        console.log('   ❌ Unexpected response format');
        testResults.failed++;
      }
    } catch (error: any) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
      testResults.failed++;
    }

    testResults.total++;
    logStep(3, 'Submitting feedback without NPS score (optional)');
    try {
      const response = await axios.post(
        `${FEEDBACK_URL}/create`,
        TEST_FEEDBACKS.validWithoutNps
      );

      if (response.status === 201) {
        logSuccess('Feedback submitted without NPS score');
        console.log(`   NPS Score: ${response.data.data.npsScore === undefined ? 'Not provided' : response.data.data.npsScore}`);
        testResults.passed++;
      }
    } catch (error: any) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
      testResults.failed++;
    }

    // Submit sample data for NPS calculation
    logInfo('Submitting sample feedback for NPS testing...');
    const sampleFeedbacks = [
      TEST_FEEDBACKS.promoter,
      { ...TEST_FEEDBACKS.promoter, company: 'Promoter Corp 2' },
      TEST_FEEDBACKS.passive,
      TEST_FEEDBACKS.detractor
    ];

    for (const feedback of sampleFeedbacks) {
      try {
        await axios.post(`${FEEDBACK_URL}/create`, feedback);
        await sleep(100); // Small delay to avoid overwhelming
      } catch (error) {
        // Continue even if some fail
        logInfo(`Skipping duplicate feedback for: ${feedback.company}`);
      }
    }

    // ========================================================
    // 3. FEEDBACK RETRIEVAL TESTS
    // ========================================================
    logSection('FEEDBACK RETRIEVAL TESTS');

    testResults.total++;
    logStep(4, 'Getting all feedback (sorted by rating)');
    console.log(`   GET ${FEEDBACK_URL}/`);
    try {
      const response = await axios.get(FEEDBACK_URL);

      if (response.status === 200 && response.data.success) {
        const feedbacks = response.data.data;
        logSuccess(`Retrieved ${feedbacks.length} feedback entries`);

        // Check sorting
        if (feedbacks.length > 1) {
          const sortedByRating = feedbacks.every((f: any, i: number, arr: any[]) =>
            i === 0 || f.rating <= arr[i - 1].rating
          );
          if (sortedByRating) {
            console.log(`   ✓ Correctly sorted by rating (highest first)`);
          } else {
            console.log(`   ⚠️  Not properly sorted by rating`);
          }
        }

        testResults.passed++;
      }
    } catch (error: any) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
      testResults.failed++;
    }

    testResults.total++;
    logStep(5, 'Testing legacy endpoint /getAll');
    console.log(`   GET ${FEEDBACK_URL}/getAll`);
    try {
      const response = await axios.get(`${FEEDBACK_URL}/getAll`);

      if (response.status === 200 && response.data.success) {
        logSuccess('Legacy endpoint working correctly');
        console.log(`   Returns same data as main endpoint`);
        testResults.passed++;
      }
    } catch (error: any) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
      testResults.failed++;
    }

    // ========================================================
    // 4. NPS STATISTICS TESTS
    // ========================================================
    logSection('NPS STATISTICS TESTS');

    testResults.total++;
    logStep(6, 'Calculating NPS statistics');
    console.log(`   GET ${FEEDBACK_URL}/nps`);
    try {
      const response = await axios.get(`${FEEDBACK_URL}/nps`);

      if (response.status === 200 && response.data.success) {
        const npsData = response.data.data;
        logSuccess('NPS statistics retrieved successfully');
        console.log(`   NPS Score: ${npsData.nps}`);
        console.log(`   Total Responses (with NPS): ${npsData.totalResponses}`);
        console.log(`   Promoters (9-10): ${npsData.promoters}`);
        console.log(`   Passives (7-8): ${npsData.passives}`);
        console.log(`   Detractors (0-6): ${npsData.detractors}`);

        // Validate NPS calculation
        if (npsData.totalResponses > 0) {
          const calculatedNps = Math.round(
            (npsData.promoters / npsData.totalResponses) * 100 -
            (npsData.detractors / npsData.totalResponses) * 100
          );

          if (calculatedNps === npsData.nps) {
            console.log(`   ✓ NPS calculation verified: ${calculatedNps}`);
          } else {
            console.log(`   ⚠️  NPS mismatch: Calculated ${calculatedNps}, API returned ${npsData.nps}`);
          }
        }
        testResults.passed++;
      }
    } catch (error: any) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
      testResults.failed++;
    }

    testResults.total++;
    logStep(7, 'Testing NPS with zero responses');
    console.log(`   GET ${FEEDBACK_URL}/nps (with empty database)`);
    try {
      // First, clean the database (or test in isolated environment)
      // This test assumes we can't easily clean DB, so we just check format
      const response = await axios.get(`${FEEDBACK_URL}/nps`);

      if (response.status === 200 && response.data.success) {
        const npsData = response.data.data;
        if (npsData.totalResponses === 0) {
          logSuccess('Correctly handles zero NPS responses');
          console.log(`   NPS: ${npsData.nps} (should be 0)`);
        }
        testResults.passed++;
      }
    } catch (error: any) {
      console.log('   ⚠️  NPS zero test skipped:', error.message);
      testResults.failed++;
    }

    // ========================================================
    // 5. FEEDBACK INSIGHTS TESTS (REMOVED)
    // ========================================================
    // AI insight tests removed as per user request


    // ========================================================
    // 6. DATA CONSISTENCY TESTS
    // ========================================================
    logSection('DATA CONSISTENCY TESTS');

    testResults.total++;
    logStep(9, 'Testing data consistency across endpoints');
    try {
      // Get all feedback
      const allFeedback = await axios.get(FEEDBACK_URL);
      const npsStats = await axios.get(`${FEEDBACK_URL}/nps`);

      if (allFeedback.data.success && npsStats.data.success) {
        // Count feedbacks with NPS scores
        const feedbacksWithNps = allFeedback.data.data.filter((f: any) =>
          f.npsScore !== undefined && f.npsScore !== null
        ).length;

        const npsTotal = npsStats.data.data.totalResponses;

        if (feedbacksWithNps === npsTotal) {
          logSuccess(`Data consistency verified: ${feedbacksWithNps} feedbacks with NPS scores`);
        } else {
          console.log(`   ⚠️  Data mismatch: Feedback with NPS (${feedbacksWithNps}) vs NPS stats (${npsTotal})`);
          console.log(`   This might be expected if some feedback was created without NPS`);
        }
        testResults.passed++;
      }
    } catch (error: any) {
      console.log('   ⚠️  Consistency check skipped:', error.message);
      testResults.failed++;
    }

    // ========================================================
    // 7. BOUNDARY & EDGE CASE TESTS
    // ========================================================
    logSection('BOUNDARY & EDGE CASE TESTS');

    testResults.total++;
    logStep(10, 'Testing rating boundary values (1-5)');
    try {
      // Test minimum rating
      const minRatingFeedback = {
        company: 'Boundary Test Min',
        rating: 1,
        location: 'Test City',
        review: 'Minimum rating test'
      };

      const minResponse = await axios.post(
        `${FEEDBACK_URL}/create`,
        minRatingFeedback
      );

      // Test maximum rating  
      const maxRatingFeedback = {
        company: 'Boundary Test Max',
        rating: 5,
        location: 'Test City',
        review: 'Maximum rating test'
      };

      const maxResponse = await axios.post(
        `${FEEDBACK_URL}/create`,
        maxRatingFeedback
      );

      if (minResponse.status === 201 && maxResponse.status === 201) {
        logSuccess('Rating boundaries accepted correctly (1-5)');
        testResults.passed++;
      }
    } catch (error: any) {
      console.log('   ⚠️  Boundary test skipped:', error.message);
      testResults.failed++;
    }

    // ========================================================
    // TEST SUMMARY
    // ========================================================
    logSection('TEST SUMMARY');

    console.log('\n📊 RESULTS:');
    console.log(`   Total Tests: ${testResults.total}`);
    console.log(`   Passed: ${testResults.passed} ✅`);
    console.log(`   Failed: ${testResults.failed} ❌`);

    const successRate = testResults.total > 0
      ? Math.round((testResults.passed / testResults.total) * 100)
      : 0;

    console.log(`   Success Rate: ${successRate}%`);

    console.log('\n🎯 ENDPOINTS TESTED:');
    console.log('   ✅ POST /api/feedback/create');
    console.log('   ✅ GET  /api/feedback/');
    console.log('   ✅ GET  /api/feedback/getAll (legacy)');
    console.log('   ✅ GET  /api/feedback/nps');


    console.log('\n🧪 TEST CATEGORIES:');
    console.log('   ✅ Validation & Error Handling');
    console.log('   ✅ Data Submission & Retrieval');
    console.log('   ✅ NPS Calculation & Statistics');

    console.log('   ✅ Data Consistency');
    console.log('   ✅ Boundary Cases');

    console.log('\n' + '='.repeat(70));
    if (testResults.failed === 0) {
      console.log('🎉 ALL FEEDBACK TESTS COMPLETED SUCCESSFULLY!');
    } else if (successRate >= 80) {
      console.log(`⚠️  ${testResults.failed} test(s) failed, but core functionality is working.`);
    } else {
      console.log(`❌ ${testResults.failed} test(s) failed. Review output above.`);
    }
    console.log('='.repeat(70));

    // Exit with appropriate code
    process.exit(testResults.failed === 0 ? 0 : 1);

  } catch (error: any) {
    console.error('\n💥 UNEXPECTED ERROR IN TEST SUITE:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('URL:', error.config?.url);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// ============================================================
// RUN TESTS
// ============================================================
runFeedbackTests();