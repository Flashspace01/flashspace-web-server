import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

// Create Redis client
let redisClient: ReturnType<typeof createClient> | null = null;

// Only initialize Redis if configuration is provided
if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    },
    password: process.env.REDIS_PASSWORD,
  });

  // Connect to Redis
  redisClient.connect().catch((err) => {
    console.error('Redis connection error:', err);
    console.warn('Rate limiting will use memory store instead of Redis');
    redisClient = null;
  });

  // Handle Redis errors
  redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis connected successfully for rate limiting');
  });
} else {
  console.warn('Redis configuration not found. Rate limiting will use memory store.');
}

// Helper function to create Redis store
const createRedisStore = (prefix: string) => {
  if (redisClient?.isOpen) {
    return new RedisStore({
      sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
      prefix,
    });
  }
  return undefined;
};

// Global API rate limiter - applies to all API routes
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: createRedisStore('rl:global:'),
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
  store: createRedisStore('rl:auth:'),
});

// Very strict rate limiter for login/register endpoints
export const strictAuthRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour
  message: {
    error: 'Too many failed attempts. Please try again after an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
  store: createRedisStore('rl:strict-auth:'),
});

// Rate limiter for file upload endpoints
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: {
    error: 'Too many upload requests, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('rl:upload:'),
});

// Rate limiter for payment endpoints
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment requests per hour
  message: {
    error: 'Too many payment requests, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('rl:payment:'),
});

// Rate limiter for contact form and inquiry submissions
export const formSubmissionRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 form submissions per hour
  message: {
    error: 'Too many form submissions, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('rl:form:'),
});

// Rate limiter for general read operations (GET requests)
export const readRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 read requests per windowMs
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('rl:read:'),
});

// Rate limiter for admin endpoints
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 admin requests per windowMs
  message: {
    error: 'Too many admin requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('rl:admin:'),
});

export { redisClient };
