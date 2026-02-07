import { Router } from 'express';
import {
    getAvailability,
    bookMeeting,
    getMeetingDetails,
    initiateGoogleAuth,
    handleGoogleCallback,
    getAuthStatus,
    revokeGoogleAuth
} from './meetingScheduler.controller';
import { validateAvailabilityRequest, validateBooking } from './validators';

const router = Router();

// ============ Google OAuth2 Routes ============

// GET /api/meetings/auth/google
// Initiate Google OAuth2 authorization flow
router.get('/auth/google', initiateGoogleAuth);

// GET /api/meetings/auth/google/callback
// Handle OAuth2 callback from Google
router.get('/auth/google/callback', handleGoogleCallback);

// GET /api/meetings/auth/status
// Check Google Calendar authorization status
router.get('/auth/status', getAuthStatus);

// DELETE /api/meetings/auth/google
// Revoke Google Calendar authorization
router.delete('/auth/google', revokeGoogleAuth);

// ============ Meeting Routes ============

// GET /api/meetings/availability?days=7
// Get available time slots for the next N days
router.get('/availability', validateAvailabilityRequest, getAvailability);

// POST /api/meetings/book
// Book a meeting slot
router.post('/book', validateBooking, bookMeeting);

// GET /api/meetings/meeting/:meetingId
// Get meeting details by ID
router.get('/meeting/:meetingId', getMeetingDetails);

export { router as meetingSchedulerRoutes };
