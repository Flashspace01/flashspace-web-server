# FlashSpace Server API Documentation

> Complete API documentation for FlashSpace backend services

**Base URL:** `http://localhost:5000/api`  
**Production URL:** `https://api.flashspace.com/api`

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB 5.0+
- TypeScript knowledge

### Setup Instructions

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd flashspace-web-server
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/flashspace
   
   # Authentication
   JWT_SECRET=your_secure_jwt_secret
   JWT_EXPIRES_IN=7d
   
   # Email Services
   SENDGRID_API_KEY=your_sendgrid_api_key
   FROM_EMAIL=noreply@flashspace.com
   
   # Payment Gateway
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_SECRET=your_razorpay_secret
   
   # Google Services
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Verify Installation**
   ```bash
   curl http://localhost:5000/api/health
   ```

## 🏗️ Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT + Google OAuth
- **Email:** SendGrid
- **Payments:** Razorpay
- **File Upload:** Multer
- **Security:** Helmet, CORS, bcrypt

## 📁 Project Structure

```
src/
├── app.ts                    # Express app configuration
├── mainRoutes.ts            # Main route definitions
├── config/
│   ├── database.ts          # Database connection
│   ├── email.ts             # Email configuration
│   └── payment.ts           # Payment gateway setup
├── flashspaceWeb/
│   ├── controllers/         # Route handlers
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── services/           # Business logic
│   └── validators/         # Input validation
└── scripts/
    ├── seedData.ts         # Database seeding
    └── test-email.ts       # Email testing
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start with auto-reload
npm start               # Start production server
npm run build           # Compile TypeScript

# Database
npm run seed            # Seed initial data
npm run add:coordinates # Add location coordinates

# Testing
npm run test:email      # Test email functionality
npm run test:otp        # Test OTP system
```

## 🛡️ Authentication & Security

### JWT Token Structure
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "role": "user|admin|partner",
  "permissions": ["read", "write"],
  "iat": 1640995200,
  "exp": 1641600000
}
```

### Headers Required
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Rate Limiting
- **General API:** 100 requests per 15 minutes
- **Authentication:** 5 attempts per 15 minutes
- **File Upload:** 10 uploads per hour

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Contact Form](#2-contact-form)
3. [Virtual Office](#3-virtual-office)
4. [Coworking Space](#4-coworking-space)
5. [Partner Inquiry](#5-partner-inquiry)
6. [User Dashboard](#6-user-dashboard)
   - [Dashboard Overview](#61-dashboard-overview)
   - [Bookings](#62-bookings)
   - [KYC](#63-kyc-verification)
   - [Invoices](#64-invoices)
   - [Support Tickets](#65-support-tickets)
7. [Error Handling](#7-error-handling)
8. [Testing](#8-testing)
9. [Deployment](#9-deployment)

---

## 1. Authentication

Base Path: `/api/auth`

### 1.1 Sign Up

**POST** `/api/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "password": "securePassword123",
  "phoneNumber": "+91-9876543210"  // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "isEmailVerified": false
  }
}
```

---

### 1.2 Login

**POST** `/api/auth/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "user"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

---

### 1.3 Verify OTP

**POST** `/api/auth/verify-otp`

Verify email using OTP.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### 1.4 Resend OTP

**POST** `/api/auth/resend-otp`

Resend verification OTP.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

---

### 1.5 Verify Email (Legacy)

**GET** `/api/auth/verify-email?token=verification_token`

Verify email using token link.

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### 1.6 Forgot Password

**POST** `/api/auth/forgot-password`

Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset instructions sent to email"
}
```

---

### 1.7 Reset Password

**POST** `/api/auth/reset-password`

Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token",
  "newPassword": "newSecurePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### 1.8 Refresh Token

**POST** `/api/auth/refresh-token`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "new_jwt_access_token"
}
```

---

### 1.9 Google OAuth

**POST** `/api/auth/google`

Initiate Google OAuth login.

**Request Body:**
```json
{
  "credential": "google_id_token"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@gmail.com",
    "fullName": "John Doe",
    "profilePicture": "https://...",
    "authProvider": "google"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

---

### 1.10 Check Auth

**GET** `/api/auth/check-auth`

Check if user is authenticated.

**Headers:**
```
Authorization: Bearer <access_token>  (optional)
```

**Response (200):**
```json
{
  "success": true,
  "isAuthenticated": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "fullName": "John Doe"
  }
}
```

---

### 1.11 Get Profile (Protected)

**GET** `/api/auth/profile`

Get current user profile. Requires verified email.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+91-9876543210",
    "profilePicture": "https://...",
    "role": "user",
    "isEmailVerified": true
  }
}
```

---

### 1.12 Change Password (Protected)

**POST** `/api/auth/change-password`

Change password for logged-in user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### 1.13 Logout (Protected)

**POST** `/api/auth/logout`

Logout current session.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 1.14 Logout All Sessions (Protected)

**POST** `/api/auth/logout-all`

Logout from all devices.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out from all devices"
}
```

---

## 2. Contact Form

Base Path: `/api/contactForm`

### Service Interest Options:
- `Business Registration`
- `Mail Management`
- `Meeting Room Access`
- `Coworking Space`
- `Free Consultation`

### 2.1 Create Contact Form

**POST** `/api/contactForm/createContactForm`

Submit a new contact form.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+91-9876543210",
  "companyName": "ABC Corp",
  "serviceInterest": ["Business Registration", "Mail Management"],
  "message": "I need help with business registration"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Contact form submitted successfully",
  "data": {
    "_id": "contact_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+91-9876543210",
    "companyName": "ABC Corp",
    "serviceInterest": ["Business Registration", "Mail Management"],
    "message": "I need help with business registration",
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-01-05T10:00:00.000Z"
  }
}
```

---

### 2.2 Get All Contact Forms

**GET** `/api/contactForm/getAllContactForm`

Retrieve all contact form submissions.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "contact_id",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+91-9876543210",
      "companyName": "ABC Corp",
      "serviceInterest": ["Business Registration"],
      "message": "I need help",
      "isActive": true,
      "createdAt": "2026-01-05T10:00:00.000Z"
    }
  ]
}
```

---

### 2.3 Get Contact Form By ID

**GET** `/api/contactForm/getContactFormById/:contactId`

Retrieve a specific contact form.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "contact_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    ...
  }
}
```

---

### 2.4 Update Contact Form

**PUT** `/api/contactForm/updateContactForm/:contactId`

Update a contact form.

**Request Body:**
```json
{
  "isActive": false,
  "message": "Updated message"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Contact form updated successfully",
  "data": { ... }
}
```

---

### 2.5 Delete Contact Form

**DELETE** `/api/contactForm/deleteContactForm/:contactId`

Delete a contact form (soft delete).

**Response (200):**
```json
{
  "success": true,
  "message": "Contact form deleted successfully"
}
```

---

## 3. Virtual Office

Base Path: `/api/virtualOffice`

### 3.1 Create Virtual Office

**POST** `/api/virtualOffice/create`

Create a new virtual office listing.

**Request Body:**
```json
{
  "name": "Premium Virtual Office - Andheri",
  "address": "123, Business Park, Andheri East, Mumbai - 400069",
  "city": "Mumbai",
  "area": "Andheri",
  "price": "₹4,999/month",
  "originalPrice": "₹7,999/month",
  "gstPlanPrice": "₹2,999/month",
  "mailingPlanPrice": "₹1,499/month",
  "brPlanPrice": "₹3,499/month",
  "rating": 4.5,
  "reviews": 120,
  "features": ["24/7 Access", "Meeting Rooms", "High Speed WiFi", "Pantry"],
  "availability": "Available Now",
  "popular": true,
  "coordinates": {
    "lat": 19.1136,
    "lng": 72.8697
  },
  "image": "https://example.com/office-image.jpg"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Virtual office created successfully",
  "data": {
    "_id": "virtual_office_id",
    ...
  }
}
```

---

### 3.2 Get All Virtual Offices

**GET** `/api/virtualOffice/getAll`

Retrieve all virtual office listings.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "virtual_office_id",
      "name": "Premium Virtual Office - Andheri",
      "address": "123, Business Park, Andheri East",
      "city": "Mumbai",
      "area": "Andheri",
      "price": "₹4,999/month",
      "rating": 4.5,
      "reviews": 120,
      "features": ["24/7 Access", "Meeting Rooms"],
      "availability": "Available Now",
      "popular": true,
      "coordinates": { "lat": 19.1136, "lng": 72.8697 },
      "image": "https://..."
    }
  ]
}
```

---

### 3.3 Get Virtual Offices By City

**GET** `/api/virtualOffice/getByCity/:city`

Retrieve virtual offices in a specific city.

**Example:** `/api/virtualOffice/getByCity/Mumbai`

**Response (200):**
```json
{
  "success": true,
  "data": [ ... ]
}
```

---

### 3.4 Get Virtual Office By ID

**GET** `/api/virtualOffice/getById/:virtualOfficeId`

Retrieve a specific virtual office.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "virtual_office_id",
    ...
  }
}
```

---

### 3.5 Update Virtual Office

**PUT** `/api/virtualOffice/update/:virtualOfficeId`

Update a virtual office listing.

**Request Body:**
```json
{
  "price": "₹5,499/month",
  "popular": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Virtual office updated successfully",
  "data": { ... }
}
```

---

### 3.6 Delete Virtual Office

**DELETE** `/api/virtualOffice/delete/:virtualOfficeId`

Delete a virtual office (soft delete).

**Response (200):**
```json
{
  "success": true,
  "message": "Virtual office deleted successfully"
}
```

---

## 4. Coworking Space

Base Path: `/api/coworkingSpace`

### Desk Types:
- `Hot Desk`
- `Dedicated Desk`
- `Private Office`
- `Shared Desk`

### 4.1 Create Coworking Space

**POST** `/api/coworkingSpace/create`

Create a new coworking space listing.

**Request Body:**
```json
{
  "name": "Creative Hub - BKC",
  "address": "456, Tech Tower, BKC, Mumbai - 400051",
  "city": "Mumbai",
  "area": "BKC",
  "price": "₹8,999/month",
  "originalPrice": "₹12,999/month",
  "gstPlanPrice": "₹6,999/month",
  "mailingPlanPrice": "₹2,999/month",
  "brPlanPrice": "₹5,499/month",
  "rating": 4.8,
  "reviews": 85,
  "type": "Hot Desk",
  "features": ["Ergonomic Chairs", "Standing Desks", "Cafeteria", "Gym Access"],
  "availability": "Available Now",
  "popular": true,
  "coordinates": {
    "lat": 19.0596,
    "lng": 72.8656
  },
  "image": "https://example.com/coworking-image.jpg"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Coworking space created successfully",
  "data": {
    "_id": "coworking_space_id",
    ...
  }
}
```

---

### 4.2 Get All Coworking Spaces

**GET** `/api/coworkingSpace/getAll`

Retrieve all coworking space listings.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "coworking_space_id",
      "name": "Creative Hub - BKC",
      "address": "456, Tech Tower, BKC",
      "city": "Mumbai",
      "area": "BKC",
      "price": "₹8,999/month",
      "type": "Hot Desk",
      "rating": 4.8,
      "reviews": 85,
      "features": ["Ergonomic Chairs", "Standing Desks"],
      "availability": "Available Now",
      "popular": true
    }
  ]
}
```

---

### 4.3 Get Coworking Spaces By City

**GET** `/api/coworkingSpace/getByCity/:city`

Retrieve coworking spaces in a specific city.

**Example:** `/api/coworkingSpace/getByCity/Bangalore`

**Response (200):**
```json
{
  "success": true,
  "data": [ ... ]
}
```

---

### 4.4 Get Coworking Space By ID

**GET** `/api/coworkingSpace/getById/:coworkingSpaceId`

Retrieve a specific coworking space.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "coworking_space_id",
    ...
  }
}
```

---

### 4.5 Update Coworking Space

**PUT** `/api/coworkingSpace/update/:coworkingSpaceId`

Update a coworking space listing.

**Request Body:**
```json
{
  "price": "₹9,499/month",
  "type": "Dedicated Desk"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Coworking space updated successfully",
  "data": { ... }
}
```

---

### 4.6 Delete Coworking Space

**DELETE** `/api/coworkingSpace/delete/:coworkingSpaceId`

Delete a coworking space (soft delete).

**Response (200):**
```json
{
  "success": true,
  "message": "Coworking space deleted successfully"
}
```

---

## 5. Partner Inquiry

Base Path: `/api/partnerInquiry`

### Status Options:
- `pending`
- `contacted`
- `approved`
- `rejected`

### 5.1 Submit Partner Inquiry

**POST** `/api/partnerInquiry/submit`

Submit a new partner inquiry.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@company.com",
  "phone": "+91-9876543210",
  "company": "XYZ Properties",
  "partnershipType": "Space Provider",
  "message": "We have 5000 sq ft space available for partnership"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Partner inquiry submitted successfully",
  "data": {
    "_id": "inquiry_id",
    "name": "Jane Smith",
    "email": "jane@company.com",
    "phone": "+91-9876543210",
    "company": "XYZ Properties",
    "partnershipType": "Space Provider",
    "message": "We have 5000 sq ft space available",
    "status": "pending",
    "isDeleted": false,
    "createdAt": "2026-01-05T10:00:00.000Z"
  }
}
```

---

### 5.2 Get All Partner Inquiries

**GET** `/api/partnerInquiry/all`

Retrieve all partner inquiries.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "inquiry_id",
      "name": "Jane Smith",
      "email": "jane@company.com",
      "phone": "+91-9876543210",
      "company": "XYZ Properties",
      "partnershipType": "Space Provider",
      "status": "pending",
      "createdAt": "2026-01-05T10:00:00.000Z"
    }
  ]
}
```

---

### 5.3 Update Partner Inquiry Status

**PUT** `/api/partnerInquiry/:inquiryId/status`

Update the status of a partner inquiry.

**Request Body:**
```json
{
  "status": "contacted"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Partner inquiry status updated",
  "data": {
    "_id": "inquiry_id",
    "status": "contacted",
    ...
  }
}
```

---

## Error Responses

All endpoints return errors in the following format:

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (only in development)"
}
```

### Common HTTP Status Codes:

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests (Rate Limited) |
| 500 | Internal Server Error |

---

## Rate Limiting

Some authentication endpoints have rate limiting:

| Endpoint | Limit |
|----------|-------|
| `/auth/forgot-password` | 3 requests per 15 minutes |
| `/auth/reset-password` | 3 requests per 15 minutes |

---

## Authentication Headers

For protected routes, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

---

## Environment Variables Required

```env
PORT=5000
HOST=0.0.0.0
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
FRONTEND_URL=https://flashspace.ai
SENDGRID_API_KEY=your_sendgrid_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## Postman Collection

Import this documentation into Postman by creating a new collection with the following structure:

```
FlashSpace API
├── Auth
│   ├── Signup
│   ├── Login
│   ├── Verify OTP
│   ├── Resend OTP
│   ├── Forgot Password
│   ├── Reset Password
│   ├── Refresh Token
│   ├── Google Auth
│   ├── Check Auth
│   ├── Get Profile
│   ├── Change Password
│   ├── Logout
│   └── Logout All
├── Contact Form
│   ├── Create
│   ├── Get All
│   ├── Get By ID
│   ├── Update
│   └── Delete
├── Virtual Office
│   ├── Create
│   ├── Get All
│   ├── Get By City
│   ├── Get By ID
│   ├── Update
│   └── Delete
├── Coworking Space
│   ├── Create
│   ├── Get All
│   ├── Get By City
│   ├── Get By ID
│   ├── Update
│   └── Delete
├── User Dashboard
│   ├── Get Dashboard Overview
│   ├── Get All Bookings
│   ├── Get Booking By ID
│   ├── Toggle Auto-Renew
│   ├── Get KYC Status
│   ├── Update Business Info
│   ├── Upload KYC Document
│   ├── Get All Invoices
│   ├── Get Invoice By ID
│   ├── Get All Tickets
│   ├── Create Ticket
│   ├── Get Ticket By ID
│   └── Reply to Ticket
└── Partner Inquiry
    ├── Submit
    ├── Get All
    └── Update Status
```

---

## 6. User Dashboard

Base Path: `/api/user`

**Authentication Required:** All endpoints require Bearer token in Authorization header.

### 6.1 Dashboard Overview

**GET** `/api/user/dashboard`

Get dashboard stats for logged-in user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "activeServices": 2,
    "pendingInvoices": 3200,
    "nextBookingDate": "2026-02-05T00:00:00.000Z",
    "kycStatus": "verified",
    "recentActivity": [
      {
        "type": "booking",
        "message": "Premium Virtual Office - Andheri - active",
        "date": "2026-01-08T10:00:00.000Z"
      }
    ],
    "usageBreakdown": {
      "virtualOffice": 65,
      "coworkingSpace": 35
    },
    "monthlyBookings": [
      { "month": "Aug", "count": 4 },
      { "month": "Sep", "count": 6 },
      { "month": "Oct", "count": 7 }
    ]
  }
}
```

---

### 6.2 Bookings

#### Get All Bookings

**GET** `/api/user/bookings`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Filter by `virtual_office` or `coworking_space` |
| `status` | string | Filter by `pending_kyc`, `active`, `expired`, `cancelled` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "booking_id",
      "bookingNumber": "FS-2026-00042",
      "type": "virtual_office",
      "status": "active",
      "spaceSnapshot": {
        "name": "Premium Virtual Office - Andheri",
        "address": "123, Business Park, Andheri East, Mumbai",
        "city": "Mumbai",
        "image": "https://..."
      },
      "plan": {
        "name": "GST Registration Plan",
        "price": 15000,
        "tenure": 12,
        "tenureUnit": "months"
      },
      "startDate": "2026-01-10T00:00:00.000Z",
      "endDate": "2027-01-10T00:00:00.000Z",
      "daysRemaining": 365,
      "createdAt": "2026-01-08T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "pages": 1
  }
}
```

---

#### Get Booking By ID

**GET** `/api/user/bookings/:bookingId`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "booking_id",
    "bookingNumber": "FS-2026-00042",
    "type": "virtual_office",
    "status": "active",
    "spaceSnapshot": { ... },
    "plan": { ... },
    "timeline": [
      { "status": "payment_received", "date": "2026-01-08", "note": "Payment confirmed" },
      { "status": "kyc_approved", "date": "2026-01-09", "note": "Verified by Admin" },
      { "status": "active", "date": "2026-01-10", "note": "Service activated" }
    ],
    "documents": [
      { "name": "Client Agreement", "type": "agreement", "url": "https://..." },
      { "name": "NOC Certificate", "type": "noc", "url": "https://..." }
    ],
    "startDate": "2026-01-10T00:00:00.000Z",
    "endDate": "2027-01-10T00:00:00.000Z",
    "autoRenew": true
  }
}
```

---

#### Toggle Auto-Renew

**PATCH** `/api/user/bookings/:bookingId/auto-renew`

**Request Body:**
```json
{
  "autoRenew": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Auto-renewal disabled"
}
```

---

### 6.3 KYC Verification

#### Get KYC Status

**GET** `/api/user/kyc`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overallStatus": "pending",
    "progress": 65,
    "personalInfo": {
      "fullName": "Anshu Prasad",
      "email": "anshu@example.com",
      "phone": "+91-9899223359",
      "verified": true
    },
    "businessInfo": {
      "companyName": "Talenode Analytics Pvt Ltd",
      "companyType": "Private Limited",
      "gstNumber": "27AABCT1234F1ZH",
      "panNumber": "AABCT1234F",
      "cinNumber": "U78300DL2024PTC432593",
      "verified": false
    },
    "documents": [
      {
        "type": "pan_card",
        "name": "PAN Card",
        "status": "approved",
        "uploadedAt": "2026-01-08T10:00:00.000Z"
      },
      {
        "type": "gst_certificate",
        "name": "GST Certificate",
        "status": "pending",
        "uploadedAt": "2026-01-08T10:00:00.000Z"
      }
    ]
  }
}
```

---

#### Update Business Info

**PUT** `/api/user/kyc/business-info`

**Request Body:**
```json
{
  "companyName": "Talenode Analytics Pvt Ltd",
  "companyType": "Private Limited",
  "gstNumber": "27AABCT1234F1ZH",
  "panNumber": "AABCT1234F",
  "cinNumber": "U78300DL2024PTC432593",
  "registeredAddress": "123, ABC Building, Mumbai - 400001"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Business information updated"
}
```

---

#### Upload KYC Document

**POST** `/api/user/kyc/upload`

**Request Body:**
```json
{
  "documentType": "pan_card",
  "fileUrl": "https://storage.example.com/pan-card.pdf",
  "name": "PAN Card"
}
```

**Document Types:**
- `pan_card`
- `aadhaar_card`
- `gst_certificate`
- `coi` (Certificate of Incorporation)
- `address_proof`
- `bank_statement`

**Response (201):**
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "type": "pan_card",
    "status": "pending",
    "uploadedAt": "2026-01-10T10:00:00.000Z"
  }
}
```

---

### 6.4 Invoices

#### Get All Invoices

**GET** `/api/user/invoices`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by `paid`, `pending`, `overdue` |
| `fromDate` | string | Start date (YYYY-MM-DD) |
| `toDate` | string | End date (YYYY-MM-DD) |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPaid": 45000,
      "totalPending": 3200,
      "totalInvoices": 5
    },
    "invoices": [
      {
        "_id": "invoice_id",
        "invoiceNumber": "INV-2026-0042",
        "bookingNumber": "FS-2026-00042",
        "description": "Virtual Office - GST Plan (Andheri)",
        "subtotal": 12712,
        "taxRate": 18,
        "taxAmount": 2288,
        "total": 15000,
        "status": "paid",
        "paidAt": "2026-01-08T10:00:00.000Z"
      }
    ]
  },
  "pagination": { "total": 5, "page": 1, "pages": 1 }
}
```

---

#### Get Invoice By ID

**GET** `/api/user/invoices/:invoiceId`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "invoice_id",
    "invoiceNumber": "INV-2026-0042",
    "description": "Virtual Office - GST Plan",
    "lineItems": [
      { "description": "GST Registration Plan - 1 Year", "quantity": 1, "rate": 12712, "amount": 12712 }
    ],
    "subtotal": 12712,
    "taxRate": 18,
    "taxAmount": 2288,
    "total": 15000,
    "status": "paid",
    "billingAddress": {
      "name": "Anshu Prasad",
      "company": "Talenode Analytics",
      "gstNumber": "27AABCT1234F1ZH"
    }
  }
}
```

---

### 6.5 Support Tickets

#### Get All Tickets

**GET** `/api/user/support/tickets`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ticket_id",
      "ticketNumber": "TKT-2026-0042",
      "subject": "GST Certificate not reflecting",
      "category": "kyc",
      "status": "in_progress",
      "priority": "high",
      "createdAt": "2026-01-08T10:00:00.000Z"
    }
  ]
}
```

---

#### Create Support Ticket

**POST** `/api/user/support/tickets`

**Request Body:**
```json
{
  "subject": "Unable to download NOC document",
  "category": "virtual_office",
  "priority": "medium",
  "description": "When I click on download NOC, I get an error.",
  "bookingId": "booking_id"
}
```

**Categories:** `virtual_office`, `coworking`, `billing`, `kyc`, `technical`, `other`

**Priority:** `low`, `medium`, `high`, `urgent`

**Response (201):**
```json
{
  "success": true,
  "message": "Support ticket created",
  "data": {
    "_id": "ticket_id",
    "ticketNumber": "TKT-2026-0043",
    "status": "open"
  }
}
```

---

#### Get Ticket By ID

**GET** `/api/user/support/tickets/:ticketId`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "ticket_id",
    "ticketNumber": "TKT-2026-0042",
    "subject": "GST Certificate not reflecting",
    "category": "kyc",
    "status": "in_progress",
    "messages": [
      {
        "sender": "user",
        "senderName": "Anshu Prasad",
        "message": "My GST certificate was approved but not showing.",
        "createdAt": "2026-01-08T10:00:00.000Z"
      },
      {
        "sender": "support",
        "senderName": "Ramit (Support)",
        "message": "Hi, we are looking into this.",
        "createdAt": "2026-01-08T14:00:00.000Z"
      }
    ]
  }
}
```

---

#### Reply to Ticket

**POST** `/api/user/support/tickets/:ticketId/reply`

**Request Body:**
```json
{
  "message": "Thank you, please let me know once resolved."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Reply sent"
}

---

## 7. Error Handling

### Standard Error Response Format

`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error context",
    "timestamp": "2026-02-05T10:30:00.000Z",
    "path": "/api/endpoint"
  }
}
`

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `AUTHENTICATION_FAILED` | 401 | Invalid credentials |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down |

### Error Examples

#### Validation Error
`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "message": "Please provide a valid email address"
    }
  }
}
`

---

## 8. Testing

### API Testing with cURL

#### Test Authentication
`bash
# Sign up
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Test User",
    "password": "securePassword123",
    "confirm-password": ""
  }'

# Sign in  
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securePassword123"
  }'
`

### Testing Scripts

`bash
# Test email functionality
npm run test:email

# Test OTP system
npm run test:otp
`

---

## 9. Database Models

### User Model
`typescript
interface IUser {
  _id: ObjectId;
  email: string;
  fullName: string;
  phoneNumber?: string;
  password: string;
  role: 'user' | 'admin' | 'partner';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}
`

### Booking Model
`typescript
interface IBooking {
  _id: ObjectId;
  userId: ObjectId;
  spaceId: ObjectId;
  bookingType: 'virtual-office' | 'coworking';
  startDate: Date;
  endDate: Date;
  duration: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}
`

---

## 10. Deployment

### Environment Setup

#### Development
`env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/flashspace_dev
JWT_SECRET=dev_secret_key
`

#### Production
`env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://prod-cluster/flashspace
JWT_SECRET=super_secure_production_secret
`

### Health Check Endpoint

**GET** `/api/health`

`json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-05T10:30:00.000Z",
  "services": {
    "database": "connected",
    "email": "operational", 
    "payment": "operational"
  },
  "version": "1.0.0",
  "uptime": "2h 15m 30s"
}
`

---

##  Contributing

### Code Standards
- Use TypeScript for all new code
- Follow ESLint configuration
- Write unit tests for new features
- Document all API changes

### Pull Request Process
1. Create feature branch from `develop`
2. Implement changes with tests
3. Update API documentation
4. Submit pull request
5. Code review by 2+ developers

---

##  Support

For API support:
- **Issues:** Create GitHub issue
- **Documentation:** Check `/docs` folder
- **Emergency:** Contact development team

---

**Happy coding! **
