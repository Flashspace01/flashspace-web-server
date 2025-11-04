# 🔐 OTP-Based Authentication System - Complete Documentation

## 📋 Overview

FlashSpace ab ek complete **OTP (One-Time Password) based email verification system** use karta hai jo secure, user-friendly aur production-ready hai.

---

## ✨ Features

### 🎯 Core Features
- ✅ **6-digit Secure OTP Generation** - Cryptographically secure random OTPs
- ✅ **Time-based Expiry** - OTPs automatically expire after 10 minutes
- ✅ **Attempt Limiting** - Maximum 3 attempts per OTP
- ✅ **Rate Limiting** - Maximum 3 OTP requests per 15 minutes
- ✅ **Professional Email Templates** - Beautiful, responsive HTML emails via SendGrid
- ✅ **Multiple OTP Types** - Verification OTP, Login OTP, Password Reset OTP
- ✅ **Automatic Cleanup** - Expired OTPs are automatically cleared
- ✅ **Welcome Emails** - Automatic welcome email after successful verification

### 🛡️ Security Features
- 🔒 JWT token-based authentication
- 🔐 Secure password hashing with bcrypt
- 📧 Email-based verification
- 🚫 Brute-force protection with rate limiting
- ⏱️ Time-limited OTPs (10 minutes)
- 🔢 Attempt-limited OTPs (3 attempts)

---

## 🏗️ Architecture

### File Structure
```
flashspace-web-server/
├── src/
│   ├── flashspaceWeb/
│   │   └── authModule/
│   │       ├── models/
│   │       │   └── user.model.ts          # User schema with OTP fields
│   │       ├── utils/
│   │       │   ├── otp.util.ts            # OTP generation & verification
│   │       │   ├── email.util.ts          # Email service (SendGrid)
│   │       │   ├── password.util.ts       # Password hashing
│   │       │   └── jwt.util.ts            # JWT token management
│   │       ├── services/
│   │       │   └── auth.service.ts        # Business logic
│   │       ├── controllers/
│   │       │   └── auth.controller.ts     # API endpoints
│   │       ├── repositories/
│   │       │   └── user.repository.ts     # Database operations
│   │       ├── routes/
│   │       │   └── auth.routes.ts         # API routes
│   │       └── middleware/
│   │           └── auth.middleware.ts     # Authentication middleware
│   └── scripts/
│       ├── test-otp-system.ts             # OTP system testing
│       └── test-email.ts                  # Email service testing
├── .env                                    # Environment variables
└── package.json
```

### Database Schema (User Model)
```typescript
{
  // Basic Info
  email: string
  fullName: string
  password: string (hashed)
  phoneNumber?: string
  
  // Email Verification - OTP Based
  isEmailVerified: boolean
  emailVerificationOTP: string (6-digit)
  emailVerificationOTPExpiry: Date
  emailVerificationOTPAttempts: number (0-3)
  
  // Rate Limiting
  lastOTPRequestTime: Date
  otpRequestCount: number
  
  // Authentication
  refreshTokens: string[]
  lastLogin: Date
  authProvider: 'local' | 'google'
  role: 'user' | 'admin' | 'vendor'
}
```

---

## 🔄 Complete User Flow

### 1️⃣ User Registration Flow
```
User → Signup → Server generates OTP → Email sent → User enters OTP → Verification → Welcome Email → Login
```

**Step-by-Step:**
1. User submits signup form (email, password, fullName)
2. Server validates data and creates user account
3. Server generates 6-digit OTP (valid for 10 minutes)
4. OTP is saved in database with expiry time
5. Beautiful email with OTP is sent via SendGrid
6. User receives email and enters OTP
7. Server verifies OTP (checks validity, expiry, attempts)
8. If valid, user is marked as verified
9. Welcome email is sent automatically
10. User receives JWT tokens and is logged in

### 2️⃣ OTP Verification Flow
```
Enter OTP → Check expiry → Check attempts → Verify code → Update user → Send tokens
```

**Validation Checks:**
- ✅ User exists and is not already verified
- ✅ OTP exists in database
- ✅ OTP has not expired (< 10 minutes)
- ✅ Attempts not exceeded (< 3 attempts)
- ✅ OTP matches stored value

### 3️⃣ Resend OTP Flow
```
Request resend → Check rate limit → Generate new OTP → Send email → Update database
```

**Rate Limiting:**
- Maximum 3 OTP requests per 15-minute window
- Counter resets after 15 minutes
- User is informed of retry time if limit exceeded

---

## 📡 API Endpoints

### Authentication Endpoints

#### 1. Signup (Register New User)
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "fullName": "John Doe",
  "phoneNumber": "+91 9876543210"  // optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Account created successfully. Please check your email for the verification code.",
  "data": {
    "id": "60d5ec49f1b2c72b8c8e4a1a",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "user",
    "isEmailVerified": false
  },
  "error": {}
}
```

#### 2. Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully! Welcome to FlashSpace.",
  "data": {
    "user": {
      "id": "60d5ec49f1b2c72b8c8e4a1a",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "user",
      "isEmailVerified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "error": {}
}
```

**Response (Invalid OTP):**
```json
{
  "success": false,
  "message": "Invalid OTP. You have 2 attempts remaining.",
  "data": {},
  "error": "Invalid OTP. You have 2 attempts remaining."
}
```

**Response (Expired OTP):**
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new one.",
  "data": {},
  "error": "OTP has expired. Please request a new one."
}
```

#### 3. Resend OTP
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "A new verification code has been sent to your email.",
  "data": {},
  "error": {}
}
```

**Response (Rate Limited):**
```json
{
  "success": false,
  "message": "Too many OTP requests. Please try again in 12 minutes.",
  "data": {
    "retryAfter": 12
  },
  "error": "Too many OTP requests. Please try again in 12 minutes."
}
```

#### 4. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "60d5ec49f1b2c72b8c8e4a1a",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "user",
      "isEmailVerified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "error": {}
}
```

**Response (Email Not Verified):**
```json
{
  "success": false,
  "message": "Please verify your email before logging in",
  "data": {},
  "error": "Please verify your email before logging in"
}
```

---

## 📧 Email Templates

### 1. Email Verification OTP
**Subject:** 🔐 Your FlashSpace Verification Code

**Features:**
- Large, prominent 6-digit OTP display
- Expiry time clearly shown (10 minutes)
- Security warnings
- Attempt information (3 attempts)
- Professional gradient design

### 2. Login OTP (Optional)
**Subject:** 🔒 Your FlashSpace Login Code

**Features:**
- 5-minute validity for quick login
- Location information (if available)
- Security alert if not requested
- Timestamp of login attempt

### 3. Welcome Email
**Subject:** 🎉 Welcome to FlashSpace - Your Account is Active!

**Features:**
- Congratulations message
- Feature highlights
- Call-to-action button
- Support information

### 4. Password Reset (Legacy)
**Subject:** Reset Your Password - FlashSpace

**Features:**
- Secure reset link
- 1-hour expiry
- Security warnings

---

## ⚙️ Environment Configuration

### Required Environment Variables
```env
# Database
DB_URI="mongodb+srv://username:password@cluster.mongodb.net/"
PORT=5000

# Email Configuration (SendGrid)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=team@flashspace.co
EMAIL_USER=piyushmishra@flashspace.co

# JWT Configuration
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

---

## 🧪 Testing

### Test OTP System
```bash
npm run test:otp
```

**Tests:**
- ✅ OTP Generation (6-digit numeric)
- ✅ OTP with Expiry
- ✅ Valid OTP Verification
- ✅ Invalid OTP Verification
- ✅ Expired OTP Handling
- ✅ Max Attempts Handling
- ✅ Rate Limiting
- ✅ Alphanumeric OTP Generation
- ✅ Email Sending

### Test Email Service
```bash
npm run test:email
```

### Manual Testing with Postman/Thunder Client

#### 1. Register User
```
POST http://localhost:5000/api/auth/signup
Body: {
  "email": "test@example.com",
  "password": "Test123!@#",
  "confirmPassword": "Test123!@#",
  "fullName": "Test User"
}
```

#### 2. Check Email for OTP
- Look in inbox for email from team@flashspace.co
- Note the 6-digit OTP code

#### 3. Verify OTP
```
POST http://localhost:5000/api/auth/verify-otp
Body: {
  "email": "test@example.com",
  "otp": "123456"
}
```

#### 4. Test Resend
```
POST http://localhost:5000/api/auth/resend-otp
Body: {
  "email": "test@example.com"
}
```

---

## 🔒 Security Best Practices

### Implemented Security Measures

1. **OTP Security**
   - Cryptographically secure random generation
   - Time-limited (10 minutes)
   - Attempt-limited (3 tries)
   - Automatic cleanup of expired OTPs

2. **Rate Limiting**
   - Signup: 5 attempts per 15 minutes
   - Login: 5 attempts per 15 minutes
   - OTP Resend: 3 attempts per 15 minutes
   - Password Reset: 3 attempts per 15 minutes

3. **Password Security**
   - Minimum 8 characters
   - Requires uppercase, lowercase, number, special char
   - Hashed with bcrypt (salt rounds: 10)
   - Never stored in plain text

4. **Token Security**
   - JWT access tokens (15-minute expiry)
   - JWT refresh tokens (7-day expiry)
   - Secure HTTP-only cookies
   - Token rotation on refresh

5. **Email Security**
   - SendGrid verified sender domain
   - DKIM and SPF records
   - TLS encryption for email transmission
   - No sensitive data in email body

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Update JWT secrets to strong random values
- [ ] Configure production MongoDB URI
- [ ] Verify SendGrid sender domain
- [ ] Set correct FRONTEND_URL
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production domain only
- [ ] Set NODE_ENV=production

### SendGrid Setup
1. Create SendGrid account
2. Verify sender domain (flashspace.co)
3. Generate API key with Full Access
4. Add API key to environment variables
5. Test email sending

### Database Setup
1. Create production MongoDB cluster
2. Configure IP whitelist
3. Create database user with appropriate permissions
4. Update connection string in .env

---

## 📊 Monitoring & Logging

### Logged Events
- ✅ User registration
- ✅ OTP generation
- ✅ OTP verification attempts
- ✅ Failed verification attempts
- ✅ Rate limit violations
- ✅ Email sending success/failure
- ✅ Login attempts
- ✅ Token refresh

### Recommended Monitoring
- Track OTP verification success rate
- Monitor email delivery rates
- Alert on rate limit violations
- Track failed login attempts
- Monitor token refresh frequency

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Email Not Received
**Symptoms:** User doesn't receive OTP email

**Solutions:**
- Check spam/junk folder
- Verify SendGrid API key is valid
- Ensure sender email is verified in SendGrid
- Check SendGrid Activity Feed
- Verify EMAIL_FROM in .env

#### 2. OTP Already Expired
**Symptoms:** User enters OTP but gets "expired" error

**Solutions:**
- Use resend OTP functionality
- Check server time is synced
- Verify OTP expiry is set correctly (10 minutes)

#### 3. Rate Limit Exceeded
**Symptoms:** User can't request new OTP

**Solutions:**
- Wait for rate limit window (15 minutes)
- Check database for lastOTPRequestTime
- Manually reset counter if needed

#### 4. Invalid OTP Error
**Symptoms:** Correct OTP shows as invalid

**Solutions:**
- Check OTP is exactly 6 digits
- Verify no extra spaces in input
- Check database OTP value matches
- Ensure OTP hasn't expired

---

## 📚 Code Examples

### Using OTP Utility
```typescript
import { OTPUtil } from './utils/otp.util';

// Generate OTP
const otp = OTPUtil.generate(); // "123456"

// Generate with expiry
const otpData = OTPUtil.generateWithExpiry(10); // 10 minutes
// { otp: "123456", expiresAt: Date, attempts: 0 }

// Verify OTP
const result = OTPUtil.verify(
  userInput,
  storedOTP,
  expiryDate,
  attempts
);
// { isValid: true, message: "...", isExpired: false, attemptsExceeded: false }

// Check rate limit
const rateLimit = OTPUtil.checkRateLimit(lastRequest, count);
// { allowed: true, message: "...", retryAfter?: number }
```

### Sending OTP Email
```typescript
import { EmailUtil } from './utils/email.util';

// Initialize (done in app.ts)
EmailUtil.initialize();

// Send verification OTP
await EmailUtil.sendEmailVerificationOTP(
  email,
  otp,
  fullName
);

// Send welcome email
await EmailUtil.sendWelcomeEmail(email, fullName);
```

---

## 🎯 Future Enhancements

### Planned Features
- [ ] SMS OTP support (Twilio integration)
- [ ] 2FA with authenticator apps (TOTP)
- [ ] Biometric authentication
- [ ] Social login (Google, Facebook)
- [ ] Magic link login (passwordless)
- [ ] Session management dashboard
- [ ] Security audit logs

---

## 👨‍💻 Support

For issues or questions:
- 📧 Email: piyushmishra@flashspace.co
- 🌐 Website: https://flashspace.co
- 📱 Phone: Contact support team

---

## 📝 Version History

### v1.0.0 (Current)
- ✅ Complete OTP-based verification system
- ✅ SendGrid email integration
- ✅ Rate limiting and security
- ✅ Professional email templates
- ✅ Comprehensive testing suite

---

**Built with ❤️ by FlashSpace Team**
