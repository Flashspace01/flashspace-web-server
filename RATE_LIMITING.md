# Rate Limiting Configuration

This document explains the rate limiting implementation in the FlashSpace Web Server.

## Overview

Rate limiting has been implemented across all API endpoints to prevent abuse, enhance security, and ensure fair usage of resources. The implementation uses `express-rate-limit` with Redis as the store for distributed rate limiting.

## Configuration

### Redis Setup (Optional but Recommended)

Redis is used to store rate limit data, which is essential for:
- Distributed environments (multiple server instances)
- Persistent rate limit tracking across server restarts
- Better performance for high-traffic applications

Add these environment variables to your `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password  # Optional
```

**Note:** If Redis is not available, the system will automatically fall back to in-memory storage, but this is only suitable for single-instance development environments.

## Rate Limiter Types

### 1. Global Rate Limiter
- **Applied to:** All API routes
- **Limit:** 100 requests per 15 minutes per IP
- **Purpose:** Prevent general API abuse

### 2. Strict Auth Rate Limiter
- **Applied to:** Login and Signup endpoints
- **Limit:** 5 requests per hour per IP
- **Purpose:** Prevent brute force attacks
- **Behavior:** Only counts failed attempts (`skipSuccessfulRequests: true`)

### 3. Auth Rate Limiter
- **Applied to:** OTP verification, password reset, forgot password
- **Limit:** 10 requests per 15 minutes per IP
- **Purpose:** Prevent authentication abuse

### 4. Form Submission Rate Limiter
- **Applied to:** Contact forms, partner inquiries
- **Limit:** 5 requests per hour per IP
- **Purpose:** Prevent spam and form abuse

### 5. Payment Rate Limiter
- **Applied to:** Payment creation, verification, failure handling
- **Limit:** 10 requests per hour per IP
- **Purpose:** Prevent payment fraud and abuse

### 6. Upload Rate Limiter
- **Applied to:** KYC document uploads
- **Limit:** 20 requests per hour per IP
- **Purpose:** Prevent storage abuse

### 7. Read Rate Limiter
- **Applied to:** GET endpoints for spaces, bookings, invoices
- **Limit:** 200 requests per 15 minutes per IP
- **Purpose:** Balance between usability and abuse prevention

### 8. Admin Rate Limiter
- **Applied to:** All admin endpoints
- **Limit:** 50 requests per 15 minutes per IP
- **Purpose:** Enhanced security for admin operations

## Endpoint-Specific Rate Limits

### Authentication Module (`/api/auth`)
- `/signup` - Strict Auth Rate Limiter (5/hour)
- `/login` - Strict Auth Rate Limiter (5/hour)
- `/verify-otp` - Auth Rate Limiter (10/15min)
- `/resend-otp` - Auth Rate Limiter (10/15min)
- `/forgot-password` - Auth Rate Limiter (10/15min)
- `/reset-password` - Auth Rate Limiter (10/15min)

### Contact Form (`/api/contactForm`)
- POST `/createContactForm` - Form Submission Rate Limiter (5/hour)
- GET endpoints - Read Rate Limiter (200/15min)

### Payment Module (`/api/payment`)
- POST `/create-order` - Payment Rate Limiter (10/hour)
- POST `/verify` - Payment Rate Limiter (10/hour)
- POST `/failed` - Payment Rate Limiter (10/hour)
- GET endpoints - Read Rate Limiter (200/15min)

### Virtual Office & Coworking Space (`/api/virtualOffice`, `/api/coworkingSpace`)
- All GET endpoints - Read Rate Limiter (200/15min)

### Partner Inquiry (`/api/partnerInquiry`)
- POST `/submit` - Form Submission Rate Limiter (5/hour)
- GET endpoints - Read Rate Limiter (200/15min)

### User Dashboard (`/api/user`)
- POST `/kyc/upload` - Upload Rate Limiter (20/hour)
- Other endpoints - Global Rate Limiter (100/15min)

### Admin Module (`/api/admin`)
- All endpoints - Admin Rate Limiter (50/15min)

## Response Headers

When rate limiting is active, the following headers are included in responses:

- `RateLimit-Limit` - Maximum number of requests allowed
- `RateLimit-Remaining` - Number of requests remaining in current window
- `RateLimit-Reset` - Time when the rate limit window resets (Unix timestamp)

## Rate Limit Exceeded Response

When a rate limit is exceeded, the API returns:

**Status Code:** `429 Too Many Requests`

**Response Body:**
```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes"
}
```

## Customization

To modify rate limits, edit the configuration in `src/config/rateLimiter.config.ts`:

```typescript
export const customRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // time window in milliseconds
  max: 100, // max requests per window
  message: {
    error: 'Custom error message',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient.isOpen ? new RedisStore({...}) : undefined,
});
```

## Best Practices

1. **Development vs Production:** Consider higher limits for development and stricter limits for production
2. **Monitor Rate Limits:** Watch for legitimate users hitting limits
3. **Redis in Production:** Always use Redis in production for distributed rate limiting
4. **Whitelist IPs:** Consider whitelisting trusted IPs if needed
5. **Custom Messages:** Provide clear error messages to help users understand limits

## Testing Rate Limits

To test rate limits in development:

1. Make rapid requests to an endpoint
2. Check response headers for rate limit information
3. Verify 429 response when limit is exceeded
4. Wait for the window to reset and try again

## Troubleshooting

### Rate limits not working
- Check if Redis is connected (look for connection errors in logs)
- Verify environment variables are set correctly
- Ensure middleware is applied in correct order in route files

### Redis connection issues
- Verify Redis is running: `redis-cli ping` should return `PONG`
- Check connection details in `.env` file
- System will fall back to memory store if Redis fails

### Users hitting limits too quickly
- Review and adjust limits in `rateLimiter.config.ts`
- Consider implementing user-based rate limiting instead of IP-based
- Add whitelist for trusted users/IPs

## Security Considerations

- Rate limiting is a defense-in-depth strategy, not a complete security solution
- Combine with proper authentication, input validation, and other security measures
- Monitor logs for suspicious patterns
- Consider implementing progressive delays for repeated violations
- Use HTTPS to prevent header manipulation

## Performance Impact

- Redis-based rate limiting has minimal performance impact
- In-memory storage is faster but doesn't work in distributed environments
- Rate limit checks add ~1-2ms per request with Redis
- Consider caching strategies for read-heavy endpoints

## Future Enhancements

- Implement user-based rate limiting (track by user ID instead of IP)
- Add progressive delays (increase delay after each violation)
- Whitelist/blacklist functionality
- Custom rate limits per user tier (free vs premium)
- Analytics dashboard for rate limit violations
