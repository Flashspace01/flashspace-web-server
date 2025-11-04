# 🚀 OTP Authentication - Quick Reference

## 📞 API Endpoints (Quick Copy)

### 1. Signup
```bash
POST http://localhost:5000/api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "fullName": "John Doe",
  "phoneNumber": "+91 9876543210"
}
```

### 2. Verify OTP
```bash
POST http://localhost:5000/api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

### 3. Resend OTP
```bash
POST http://localhost:5000/api/auth/resend-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### 4. Login
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

---

## 🔧 Environment Variables (Quick Setup)

```env
# Database
DB_URI="mongodb+srv://username:password@cluster.mongodb.net/"
PORT=5000

# Email (SendGrid)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your_api_key_here
EMAIL_FROM=team@flashspace.co
EMAIL_USER=piyushmishra@flashspace.co

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 🧪 Testing Commands

```bash
# Test OTP System
npm run test:otp

# Test Email Service
npm run test:email

# Start Server
npm start

# Development Mode
npm run dev
```

---

## 📊 OTP Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| OTP Length | 6 digits | Numeric only |
| Validity | 10 minutes | Auto-expires |
| Max Attempts | 3 | Per OTP |
| Rate Limit | 3 requests / 15 min | Per user |
| Generation | Crypto-secure | Random |

---

## 🔄 User Journey

```
1. User signs up
   ↓
2. OTP generated & sent via email
   ↓
3. User enters OTP
   ↓
4. System verifies OTP
   ↓
5. Email marked as verified
   ↓
6. Welcome email sent
   ↓
7. User receives tokens & logged in
```

---

## ✅ Validation Rules

### Password Requirements
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter
- ✅ At least 1 lowercase letter
- ✅ At least 1 number
- ✅ At least 1 special character

### OTP Requirements
- ✅ Exactly 6 digits
- ✅ Numeric only
- ✅ Valid for 10 minutes
- ✅ Maximum 3 attempts

---

## 🚨 Error Codes

| Code | Message | Action |
|------|---------|--------|
| 400 | Invalid OTP format | Check 6-digit format |
| 400 | OTP expired | Request new OTP |
| 400 | Max attempts exceeded | Request new OTP |
| 429 | Rate limit exceeded | Wait X minutes |
| 401 | Email not verified | Verify email first |
| 500 | Internal server error | Check logs |

---

## 📝 Code Snippets

### Import OTP Utility
```typescript
import { OTPUtil } from './utils/otp.util';
```

### Generate OTP
```typescript
const otp = OTPUtil.generate(); // "123456"
```

### Generate with Expiry
```typescript
const otpData = OTPUtil.generateWithExpiry(10);
// { otp: "123456", expiresAt: Date, attempts: 0 }
```

### Verify OTP
```typescript
const result = OTPUtil.verify(userOTP, storedOTP, expiryDate, attempts);
```

### Check Rate Limit
```typescript
const rateLimit = OTPUtil.checkRateLimit(lastRequestTime, count);
```

### Send Email
```typescript
await EmailUtil.sendEmailVerificationOTP(email, otp, fullName);
```

---

## 🎯 Frontend Integration

### 1. Signup Form
```typescript
const signup = async (data) => {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await response.json();
  
  if (result.success) {
    // Show OTP input form
    showOTPForm();
  }
};
```

### 2. OTP Verification
```typescript
const verifyOTP = async (email, otp) => {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  const result = await response.json();
  
  if (result.success) {
    // Store tokens
    localStorage.setItem('accessToken', result.data.tokens.accessToken);
    localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
    // Redirect to dashboard
    navigate('/dashboard');
  }
};
```

### 3. Resend OTP
```typescript
const resendOTP = async (email) => {
  const response = await fetch('/api/auth/resend-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const result = await response.json();
  
  if (result.success) {
    // Show success message
    showToast('New OTP sent to your email');
  } else if (result.data.retryAfter) {
    // Show retry timer
    showRetryTimer(result.data.retryAfter);
  }
};
```

---

## 🔍 Debugging

### Check OTP in Database
```javascript
// MongoDB Query
db.users.findOne({ email: "user@example.com" }, {
  emailVerificationOTP: 1,
  emailVerificationOTPExpiry: 1,
  emailVerificationOTPAttempts: 1,
  lastOTPRequestTime: 1,
  otpRequestCount: 1
});
```

### Check SendGrid Activity
1. Go to: https://app.sendgrid.com/email_activity
2. Search by recipient email
3. Check delivery status

### Server Logs
```bash
# Watch logs
tail -f logs/app.log

# Or in development
npm run dev
```

---

## 🎨 Email Preview

### Verification OTP Email
- **Subject:** 🔐 Your FlashSpace Verification Code
- **Content:**
  - Large OTP display
  - Expiry countdown
  - Security warnings
  - Professional design

### Welcome Email
- **Subject:** 🎉 Welcome to FlashSpace
- **Content:**
  - Congratulations message
  - Feature highlights
  - CTA buttons
  - Support info

---

## 📞 Support Contacts

- **Email:** piyushmishra@flashspace.co
- **Team Email:** team@flashspace.co
- **Website:** https://flashspace.co

---

**Last Updated:** November 2024
**Version:** 1.0.0
