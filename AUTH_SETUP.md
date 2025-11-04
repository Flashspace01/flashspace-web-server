# FlashSpace Authentication Environment Variables

## Required Environment Variables for Authentication

Add these variables to your `.env` file in the `flashspace-web-server` directory:

### JWT Configuration
```env
# JWT Secrets (use strong, unique secrets for production)
JWT_ACCESS_SECRET=your-super-secret-access-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# JWT Expiry Times
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

### SMTP Configuration (for email verification and password reset)
```env
# Gmail SMTP Configuration (recommended for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email sender information
SMTP_FROM_NAME=FlashSpace
SMTP_FROM_EMAIL=your-email@gmail.com
```

### Frontend Configuration
```env
# Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

### Production Security (optional, defaults to development mode)
```env
NODE_ENV=production  # Set to 'production' for production environment
```

## Setting up Gmail SMTP

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password as `SMTP_PASS`

## JWT Secret Generation

For production, generate strong secrets:
```bash
# Generate random 32-byte hex string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Example .env file

```env
# Database
MONGODB_URI=mongodb://localhost:27017/flashspace

# Server
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_ACCESS_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
JWT_REFRESH_SECRET=f1e2d3c4b5a6789012345678901234567890fedcba1234567890fedcba123456
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM_NAME=FlashSpace
SMTP_FROM_EMAIL=your-email@gmail.com

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Authentication API Endpoints

Once configured, your authentication endpoints will be available at:

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify-email?token=<token>` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/profile` - Get user profile (authenticated)
- `POST /api/auth/change-password` - Change password (authenticated)
- `POST /api/auth/logout` - Logout current session
- `POST /api/auth/logout-all` - Logout all sessions
- `GET /api/auth/check-auth` - Check authentication status

## Security Features

✅ **Password Security**: bcrypt hashing with 12 salt rounds
✅ **JWT Security**: Separate access/refresh tokens with proper expiry
✅ **Email Verification**: Required for account activation
✅ **Password Reset**: Secure token-based password reset
✅ **Rate Limiting**: Protection against brute force attacks
✅ **HTTPS Cookies**: Secure cookie storage for tokens
✅ **CSRF Protection**: HTTP-only cookies prevent XSS
✅ **Input Validation**: Comprehensive request validation
✅ **Role-based Access**: User/Admin/Vendor role system