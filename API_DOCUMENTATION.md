# FlashSpace API Documentation

**Base URL:** `http://72.60.219.115:5000/api`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Contact Form](#2-contact-form)
3. [Virtual Office](#3-virtual-office)
4. [Coworking Space](#4-coworking-space)
5. [Partner Inquiry](#5-partner-inquiry)

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
└── Partner Inquiry
    ├── Submit
    ├── Get All
    └── Update Status
```
