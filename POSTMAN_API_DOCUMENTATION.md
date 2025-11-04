# FlashSpace API - Postman Testing Guide

## 📋 Table of Contents
- [Getting Started](#getting-started)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Authentication Module](#authentication-module)
  - [Contact Form Module](#contact-form-module)
  - [Space Provider Module](#space-provider-module)
  - [Virtual Office Module](#virtual-office-module)
  - [Coworking Space Module](#coworking-space-module)

---

## 🚀 Getting Started

### Prerequisites
- Postman installed (Download from [postman.com](https://www.postman.com/downloads/))
- Server running on `http://localhost:5000`

### Starting the Server
```bash
cd flashspace-web-server
npm run dev
```

---

## 🌐 Base URL
```
http://localhost:5000/api
```

---

## 🔐 Authentication

### Headers for Protected Routes
Protected endpoints require authentication. Add these headers:

```
Authorization: Bearer <your_access_token>
Cookie: accessToken=<token>; refreshToken=<token>
```

---

## 📡 API Endpoints

## Authentication Module

Base Path: `/api/auth`

---

### 1. **Signup** (Register New User)

**Endpoint:** `POST /api/auth/signup`

**Description:** Create a new user account. An OTP will be sent to the email for verification.

**Rate Limit:** 5 requests per 15 minutes

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!",
  "fullName": "John Doe",
  "phoneNumber": "+1234567890"
}
```

**Required Fields:**
- `email` (string, lowercase)
- `password` (string, min 6 characters)
- `confirmPassword` (string, must match password)
- `fullName` (string)

**Optional Fields:**
- `phoneNumber` (string)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for OTP verification.",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+1234567890",
    "role": "user",
    "isEmailVerified": false,
    "isActive": true,
    "createdAt": "2025-11-01T10:30:00.000Z"
  },
  "error": {}
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Email already exists",
  "data": {},
  "error": "Email already exists"
}
```

---

### 2. **Verify OTP**

**Endpoint:** `POST /api/auth/verify-otp`

**Description:** Verify email using OTP code sent during signup.

**Rate Limit:** 5 requests per 15 minutes

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "64a1b2c3d4e5f6789...",
      "email": "user@example.com",
      "fullName": "John Doe",
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

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP",
  "data": {},
  "error": "Invalid or expired OTP"
}
```

---

### 3. **Resend OTP**

**Endpoint:** `POST /api/auth/resend-otp`

**Description:** Request a new OTP if the previous one expired.

**Rate Limit:** 3 requests per 15 minutes

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "New OTP sent successfully",
  "data": {},
  "error": {}
}
```

---

### 4. **Login**

**Endpoint:** `POST /api/auth/login`

**Description:** Login with email and password.

**Rate Limit:** 5 requests per 15 minutes

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "64a1b2c3d4e5f6789...",
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

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "data": {},
  "error": "Invalid email or password"
}
```

---

### 5. **Forgot Password**

**Endpoint:** `POST /api/auth/forgot-password`

**Description:** Request password reset link/token.

**Rate Limit:** 3 requests per 15 minutes

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset link sent to your email",
  "data": {},
  "error": {}
}
```

---

### 6. **Reset Password**

**Endpoint:** `POST /api/auth/reset-password`

**Description:** Reset password using token received via email.

**Rate Limit:** 3 requests per 15 minutes

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful",
  "data": {},
  "error": {}
}
```

---

### 7. **Refresh Token**

**Endpoint:** `POST /api/auth/refresh-token`

**Description:** Get new access token using refresh token.

**Headers:**
```
Content-Type: application/json
Cookie: refreshToken=<your_refresh_token>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "error": {}
}
```

---

### 8. **Check Auth** (Semi-Protected)

**Endpoint:** `GET /api/auth/check-auth`

**Description:** Check if user is authenticated (works with or without token).

**Headers:**
```
Authorization: Bearer <your_access_token> (optional)
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User is authenticated",
  "data": {
    "isAuthenticated": true,
    "user": {
      "id": "64a1b2c3d4e5f6789...",
      "email": "user@example.com",
      "fullName": "John Doe"
    }
  },
  "error": {}
}
```

---

### 9. **Get Profile** (Protected)

**Endpoint:** `GET /api/auth/profile`

**Description:** Get user profile (requires verified email).

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+1234567890",
    "role": "user",
    "isEmailVerified": true,
    "profilePicture": "https://...",
    "createdAt": "2025-11-01T10:30:00.000Z"
  },
  "error": {}
}
```

---

### 10. **Change Password** (Protected)

**Endpoint:** `POST /api/auth/change-password`

**Description:** Change password for logged-in user.

**Headers:**
```
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {},
  "error": {}
}
```

---

### 11. **Logout** (Protected)

**Endpoint:** `POST /api/auth/logout`

**Description:** Logout from current device.

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {},
  "error": {}
}
```

---

### 12. **Logout All Devices** (Protected)

**Endpoint:** `POST /api/auth/logout-all`

**Description:** Logout from all devices.

**Headers:**
```
Authorization: Bearer <your_access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out from all devices successfully",
  "data": {},
  "error": {}
}
```

---

### 13. **Verify Email (Legacy)**

**Endpoint:** `GET /api/auth/verify-email?token=<verification_token>`

**Description:** Legacy email verification using token from email link.

**Query Parameters:**
- `token` (string, required)

**Example:**
```
GET /api/auth/verify-email?token=abc123def456...
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "email": "user@example.com",
    "isEmailVerified": true
  },
  "error": {}
}
```

---

## Contact Form Module

Base Path: `/api/contactForm`

---

### 1. **Create Contact Form**

**Endpoint:** `POST /api/contactForm/createContactForm`

**Description:** Submit a contact form inquiry.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "companyName": "Tech Corp",
  "serviceInterest": [
    "Business Registration",
    "Mail Management",
    "Meeting Room Access"
  ],
  "message": "I am interested in virtual office solutions for my startup."
}
```

**Service Interest Options:**
- `"Business Registration"`
- `"Mail Management"`
- `"Meeting Room Access"`
- `"Coworking Space"`
- `"Free Consultation"`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Contact form submitted successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "companyName": "Tech Corp",
    "serviceInterest": ["Business Registration", "Mail Management"],
    "message": "I am interested in virtual office solutions.",
    "isActive": true,
    "createdAt": "2025-11-01T10:30:00.000Z"
  },
  "error": {}
}
```

---

### 2. **Get All Contact Forms**

**Endpoint:** `GET /api/contactForm/getAllContactForm`

**Description:** Retrieve all contact form submissions.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Contact forms retrieved successfully",
  "data": [
    {
      "id": "64a1b2c3d4e5f6789...",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "companyName": "Tech Corp",
      "serviceInterest": ["Business Registration"],
      "message": "Inquiry message...",
      "isActive": true,
      "createdAt": "2025-11-01T10:30:00.000Z"
    }
  ],
  "error": {}
}
```

---

### 3. **Get Contact Form by ID**

**Endpoint:** `GET /api/contactForm/getContactFormById/:contactId`

**Description:** Retrieve a specific contact form by ID.

**Example:**
```
GET /api/contactForm/getContactFormById/64a1b2c3d4e5f6789
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Contact form retrieved successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "companyName": "Tech Corp",
    "serviceInterest": ["Business Registration"],
    "message": "Inquiry message...",
    "isActive": true,
    "createdAt": "2025-11-01T10:30:00.000Z"
  },
  "error": {}
}
```

---

### 4. **Update Contact Form**

**Endpoint:** `PUT /api/contactForm/updateContactForm/:contactId`

**Description:** Update a contact form submission.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "fullName": "John Updated",
  "message": "Updated inquiry message",
  "isActive": false
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Contact form updated successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "fullName": "John Updated",
    "message": "Updated inquiry message",
    "isActive": false
  },
  "error": {}
}
```

---

### 5. **Delete Contact Form**

**Endpoint:** `DELETE /api/contactForm/deleteContactForm/:contactId`

**Description:** Soft delete a contact form (sets isDeleted to true).

**Example:**
```
DELETE /api/contactForm/deleteContactForm/64a1b2c3d4e5f6789
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Contact form deleted successfully",
  "data": {},
  "error": {}
}
```

---

## Space Provider Module

Base Path: `/api/spaceProvider`

---

### 1. **Create Space Provider**

**Endpoint:** `POST /api/spaceProvider/createSpaceProvider`

**Description:** Add a new space provider listing.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "spaceName": "Premium Business Center",
  "spaceType": "Virtual Office",
  "city": "Mumbai",
  "capacity": "50 seats",
  "fullAddress": "123 Business Park, Andheri East, Mumbai 400069",
  "pricePerMonth": 15000,
  "amenities": "WiFi, Meeting Rooms, Parking, Pantry",
  "description": "Modern virtual office space with premium amenities",
  "fullName": "Rajesh Kumar",
  "email": "rajesh@businesscenter.com",
  "phone": "+919876543210"
}
```

**Space Type Options:**
- `"Virtual Office"`
- `"Coworking Space"`
- `"Private Office"`
- `"Meeting Room"`
- `"Event Space"`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Space provider created successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "spaceName": "Premium Business Center",
    "spaceType": "Virtual Office",
    "city": "Mumbai",
    "capacity": "50 seats",
    "fullAddress": "123 Business Park, Andheri East, Mumbai 400069",
    "pricePerMonth": 15000,
    "amenities": "WiFi, Meeting Rooms, Parking, Pantry",
    "description": "Modern virtual office space with premium amenities",
    "fullName": "Rajesh Kumar",
    "email": "rajesh@businesscenter.com",
    "phone": "+919876543210",
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2025-11-01T10:30:00.000Z"
  },
  "error": {}
}
```

---

### 2. **Get All Space Providers**

**Endpoint:** `GET /api/spaceProvider/getAllSpaceProviders`

**Description:** Retrieve all space provider listings.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Space providers retrieved successfully",
  "data": [
    {
      "id": "64a1b2c3d4e5f6789...",
      "spaceName": "Premium Business Center",
      "spaceType": "Virtual Office",
      "city": "Mumbai",
      "pricePerMonth": 15000,
      "isActive": true
    }
  ],
  "error": {}
}
```

---

### 3. **Get Space Provider by ID**

**Endpoint:** `GET /api/spaceProvider/getSpaceProviderById/:spaceProviderId`

**Description:** Retrieve a specific space provider by ID.

**Example:**
```
GET /api/spaceProvider/getSpaceProviderById/64a1b2c3d4e5f6789
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Space provider retrieved successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "spaceName": "Premium Business Center",
    "spaceType": "Virtual Office",
    "city": "Mumbai",
    "capacity": "50 seats",
    "fullAddress": "123 Business Park, Andheri East, Mumbai 400069",
    "pricePerMonth": 15000,
    "amenities": "WiFi, Meeting Rooms, Parking, Pantry",
    "description": "Modern virtual office space",
    "fullName": "Rajesh Kumar",
    "email": "rajesh@businesscenter.com",
    "phone": "+919876543210",
    "isActive": true
  },
  "error": {}
}
```

---

### 4. **Update Space Provider**

**Endpoint:** `PUT /api/spaceProvider/updateSpaceProvider/:spaceProviderId`

**Description:** Update space provider information.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "pricePerMonth": 18000,
  "amenities": "WiFi, Meeting Rooms, Parking, Pantry, Gym",
  "isActive": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Space provider updated successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "pricePerMonth": 18000,
    "amenities": "WiFi, Meeting Rooms, Parking, Pantry, Gym",
    "isActive": true
  },
  "error": {}
}
```

---

### 5. **Delete Space Provider**

**Endpoint:** `DELETE /api/spaceProvider/deleteSpaceProvider/:spaceProviderId`

**Description:** Soft delete a space provider listing.

**Example:**
```
DELETE /api/spaceProvider/deleteSpaceProvider/64a1b2c3d4e5f6789
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Space provider deleted successfully",
  "data": {},
  "error": {}
}
```

---

## Virtual Office Module

Base Path: `/api/virtualOffice`

---

### 1. **Create Virtual Office**

**Endpoint:** `POST /api/virtualOffice/create`

**Description:** Add a new virtual office listing.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "FlashSpace Andheri",
  "address": "123 Business Tower, Andheri East",
  "city": "Mumbai",
  "area": "Andheri East",
  "price": "₹10,000/month",
  "originalPrice": "₹15,000",
  "gstPlanPrice": "₹8,000/month",
  "mailingPlanPrice": "₹12,000/month",
  "brPlanPrice": "₹15,000/month",
  "rating": 4.5,
  "reviews": 120,
  "features": [
    "Business Registration",
    "GST Registration",
    "Mail Handling",
    "Meeting Room Access",
    "Professional Address"
  ],
  "availability": "Available Now",
  "popular": true,
  "coordinates": {
    "lat": 19.1136,
    "lng": 72.8697
  },
  "image": "https://example.com/image.jpg"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Virtual office created successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "name": "FlashSpace Andheri",
    "address": "123 Business Tower, Andheri East",
    "city": "Mumbai",
    "area": "Andheri East",
    "price": "₹10,000/month",
    "originalPrice": "₹15,000",
    "gstPlanPrice": "₹8,000/month",
    "mailingPlanPrice": "₹12,000/month",
    "brPlanPrice": "₹15,000/month",
    "rating": 4.5,
    "reviews": 120,
    "features": ["Business Registration", "GST Registration", "Mail Handling"],
    "availability": "Available Now",
    "popular": true,
    "coordinates": {
      "lat": 19.1136,
      "lng": 72.8697
    },
    "image": "https://example.com/image.jpg",
    "isActive": true,
    "createdAt": "2025-11-01T10:30:00.000Z"
  },
  "error": {}
}
```

---

### 2. **Get All Virtual Offices**

**Endpoint:** `GET /api/virtualOffice/getAll`

**Description:** Retrieve all virtual office listings.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Virtual offices retrieved successfully",
  "data": [
    {
      "id": "64a1b2c3d4e5f6789...",
      "name": "FlashSpace Andheri",
      "city": "Mumbai",
      "area": "Andheri East",
      "price": "₹10,000/month",
      "rating": 4.5,
      "reviews": 120,
      "popular": true,
      "isActive": true
    }
  ],
  "error": {}
}
```

---

### 3. **Get Virtual Offices by City**

**Endpoint:** `GET /api/virtualOffice/getByCity/:city`

**Description:** Retrieve virtual offices in a specific city.

**Example:**
```
GET /api/virtualOffice/getByCity/Mumbai
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Virtual offices in Mumbai retrieved successfully",
  "data": [
    {
      "id": "64a1b2c3d4e5f6789...",
      "name": "FlashSpace Andheri",
      "city": "Mumbai",
      "area": "Andheri East",
      "price": "₹10,000/month",
      "rating": 4.5
    }
  ],
  "error": {}
}
```

---

### 4. **Get Virtual Office by ID**

**Endpoint:** `GET /api/virtualOffice/getById/:virtualOfficeId`

**Description:** Retrieve a specific virtual office by ID.

**Example:**
```
GET /api/virtualOffice/getById/64a1b2c3d4e5f6789
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Virtual office retrieved successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "name": "FlashSpace Andheri",
    "address": "123 Business Tower, Andheri East",
    "city": "Mumbai",
    "area": "Andheri East",
    "price": "₹10,000/month",
    "originalPrice": "₹15,000",
    "gstPlanPrice": "₹8,000/month",
    "mailingPlanPrice": "₹12,000/month",
    "brPlanPrice": "₹15,000/month",
    "rating": 4.5,
    "reviews": 120,
    "features": ["Business Registration", "GST Registration"],
    "availability": "Available Now",
    "popular": true,
    "coordinates": {
      "lat": 19.1136,
      "lng": 72.8697
    },
    "image": "https://example.com/image.jpg",
    "isActive": true
  },
  "error": {}
}
```

---

### 5. **Update Virtual Office**

**Endpoint:** `PUT /api/virtualOffice/update/:virtualOfficeId`

**Description:** Update virtual office information.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "price": "₹12,000/month",
  "rating": 4.7,
  "reviews": 150,
  "popular": true,
  "availability": "Limited Availability"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Virtual office updated successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "price": "₹12,000/month",
    "rating": 4.7,
    "reviews": 150,
    "popular": true
  },
  "error": {}
}
```

---

### 6. **Delete Virtual Office**

**Endpoint:** `DELETE /api/virtualOffice/delete/:virtualOfficeId`

**Description:** Soft delete a virtual office listing.

**Example:**
```
DELETE /api/virtualOffice/delete/64a1b2c3d4e5f6789
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Virtual office deleted successfully",
  "data": {},
  "error": {}
}
```

---

## Coworking Space Module

Base Path: `/api/coworkingSpace`

---

### 1. **Create Coworking Space**

**Endpoint:** `POST /api/coworkingSpace/create`

**Description:** Add a new coworking space listing.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "FlashSpace Coworking BKC",
  "address": "456 BKC Complex, Bandra Kurla Complex",
  "city": "Mumbai",
  "area": "BKC",
  "price": "₹8,000/month",
  "originalPrice": "₹12,000",
  "gstPlanPrice": "₹7,000/month",
  "mailingPlanPrice": "₹9,000/month",
  "brPlanPrice": "₹11,000/month",
  "rating": 4.8,
  "reviews": 200,
  "type": "Hot Desk",
  "features": [
    "High-Speed WiFi",
    "24/7 Access",
    "Meeting Rooms",
    "Printing Services",
    "Coffee & Tea"
  ],
  "availability": "Available Now",
  "popular": true,
  "coordinates": {
    "lat": 19.0596,
    "lng": 72.8656
  },
  "image": "https://example.com/coworking.jpg"
}
```

**Desk Type Options:**
- `"Hot Desk"`
- `"Dedicated Desk"`
- `"Private Office"`
- `"Shared Desk"`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Coworking space created successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "name": "FlashSpace Coworking BKC",
    "address": "456 BKC Complex, Bandra Kurla Complex",
    "city": "Mumbai",
    "area": "BKC",
    "price": "₹8,000/month",
    "originalPrice": "₹12,000",
    "gstPlanPrice": "₹7,000/month",
    "mailingPlanPrice": "₹9,000/month",
    "brPlanPrice": "₹11,000/month",
    "rating": 4.8,
    "reviews": 200,
    "type": "Hot Desk",
    "features": ["High-Speed WiFi", "24/7 Access", "Meeting Rooms"],
    "availability": "Available Now",
    "popular": true,
    "coordinates": {
      "lat": 19.0596,
      "lng": 72.8656
    },
    "image": "https://example.com/coworking.jpg",
    "isActive": true,
    "createdAt": "2025-11-01T10:30:00.000Z"
  },
  "error": {}
}
```

---

### 2. **Get All Coworking Spaces**

**Endpoint:** `GET /api/coworkingSpace/getAll`

**Description:** Retrieve all coworking space listings.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Coworking spaces retrieved successfully",
  "data": [
    {
      "id": "64a1b2c3d4e5f6789...",
      "name": "FlashSpace Coworking BKC",
      "city": "Mumbai",
      "area": "BKC",
      "price": "₹8,000/month",
      "type": "Hot Desk",
      "rating": 4.8,
      "reviews": 200,
      "popular": true,
      "isActive": true
    }
  ],
  "error": {}
}
```

---

### 3. **Get Coworking Spaces by City**

**Endpoint:** `GET /api/coworkingSpace/getByCity/:city`

**Description:** Retrieve coworking spaces in a specific city.

**Example:**
```
GET /api/coworkingSpace/getByCity/Mumbai
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Coworking spaces in Mumbai retrieved successfully",
  "data": [
    {
      "id": "64a1b2c3d4e5f6789...",
      "name": "FlashSpace Coworking BKC",
      "city": "Mumbai",
      "area": "BKC",
      "price": "₹8,000/month",
      "type": "Hot Desk",
      "rating": 4.8
    }
  ],
  "error": {}
}
```

---

### 4. **Get Coworking Space by ID**

**Endpoint:** `GET /api/coworkingSpace/getById/:coworkingSpaceId`

**Description:** Retrieve a specific coworking space by ID.

**Example:**
```
GET /api/coworkingSpace/getById/64a1b2c3d4e5f6789
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Coworking space retrieved successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "name": "FlashSpace Coworking BKC",
    "address": "456 BKC Complex, Bandra Kurla Complex",
    "city": "Mumbai",
    "area": "BKC",
    "price": "₹8,000/month",
    "originalPrice": "₹12,000",
    "gstPlanPrice": "₹7,000/month",
    "mailingPlanPrice": "₹9,000/month",
    "brPlanPrice": "₹11,000/month",
    "rating": 4.8,
    "reviews": 200,
    "type": "Hot Desk",
    "features": ["High-Speed WiFi", "24/7 Access", "Meeting Rooms"],
    "availability": "Available Now",
    "popular": true,
    "coordinates": {
      "lat": 19.0596,
      "lng": 72.8656
    },
    "image": "https://example.com/coworking.jpg",
    "isActive": true
  },
  "error": {}
}
```

---

### 5. **Update Coworking Space**

**Endpoint:** `PUT /api/coworkingSpace/update/:coworkingSpaceId`

**Description:** Update coworking space information.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "price": "₹9,000/month",
  "rating": 4.9,
  "reviews": 250,
  "type": "Dedicated Desk",
  "popular": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Coworking space updated successfully",
  "data": {
    "id": "64a1b2c3d4e5f6789...",
    "price": "₹9,000/month",
    "rating": 4.9,
    "reviews": 250,
    "type": "Dedicated Desk"
  },
  "error": {}
}
```

---

### 6. **Delete Coworking Space**

**Endpoint:** `DELETE /api/coworkingSpace/delete/:coworkingSpaceId`

**Description:** Soft delete a coworking space listing.

**Example:**
```
DELETE /api/coworkingSpace/delete/64a1b2c3d4e5f6789
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Coworking space deleted successfully",
  "data": {},
  "error": {}
}
```

---

## 🔧 Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

---

## 🧪 Testing Workflow in Postman

### 1. **Create a Collection**
   - Open Postman
   - Click "New Collection"
   - Name it "FlashSpace API"

### 2. **Add Environment Variables**
   - Click on "Environments" → "Create Environment"
   - Add variables:
     - `baseUrl`: `http://localhost:5000/api`
     - `accessToken`: (will be set after login)
     - `refreshToken`: (will be set after login)

### 3. **Testing Authentication Flow**

**Step 1: Signup**
```
POST {{baseUrl}}/auth/signup
Body: { email, password, fullName }
```

**Step 2: Verify OTP**
```
POST {{baseUrl}}/auth/verify-otp
Body: { email, otp }
Save accessToken from response
```

**Step 3: Access Protected Routes**
```
GET {{baseUrl}}/auth/profile
Headers: Authorization: Bearer {{accessToken}}
```

### 4. **Setting Auth Token Automatically**

In Postman, add this script to the **Tests** tab of login/verify-otp requests:

```javascript
// Parse response
var jsonData = pm.response.json();

// Save tokens to environment
if (jsonData.data && jsonData.data.tokens) {
    pm.environment.set("accessToken", jsonData.data.tokens.accessToken);
    pm.environment.set("refreshToken", jsonData.data.tokens.refreshToken);
}
```

### 5. **Using Token in Requests**

For protected endpoints, add in **Headers** tab:
```
Authorization: Bearer {{accessToken}}
```

---

## 📝 Sample Test Data

### User Registration
```json
{
  "email": "test@flashspace.com",
  "password": "Test@123456",
  "confirmPassword": "Test@123456",
  "fullName": "Test User",
  "phoneNumber": "+919876543210"
}
```

### Contact Form
```json
{
  "fullName": "Amit Sharma",
  "email": "amit@startup.com",
  "phoneNumber": "+919988776655",
  "companyName": "Tech Innovations Pvt Ltd",
  "serviceInterest": ["Business Registration", "Mail Management"],
  "message": "Looking for virtual office in Mumbai"
}
```

### Virtual Office
```json
{
  "name": "FlashSpace Premium Andheri",
  "address": "Tower A, Business Hub, Andheri East",
  "city": "Mumbai",
  "area": "Andheri East",
  "price": "₹12,000/month",
  "originalPrice": "₹18,000",
  "gstPlanPrice": "₹10,000/month",
  "mailingPlanPrice": "₹14,000/month",
  "brPlanPrice": "₹16,000/month",
  "rating": 4.6,
  "reviews": 85,
  "features": ["Business Registration", "Mail Handling", "Meeting Rooms"],
  "availability": "Available Now",
  "popular": true
}
```

---

## 🛡️ Security Notes

1. **Never commit sensitive data** like real passwords or tokens
2. **Use environment variables** for base URLs and tokens
3. **Test rate limiting** - APIs have rate limits to prevent abuse
4. **HTTPS in production** - Always use HTTPS in production environment
5. **Token expiry** - Access tokens expire; use refresh token to get new ones

---

## 🐛 Troubleshooting

### Issue: "Network Error" or "Could not connect"
**Solution:** Ensure server is running on `http://localhost:5000`

### Issue: "401 Unauthorized"
**Solution:** Check if access token is valid and included in headers

### Issue: "429 Too Many Requests"
**Solution:** Wait for rate limit window to expire (15 minutes)

### Issue: "Invalid OTP"
**Solution:** Check email for latest OTP, OTPs expire in 10 minutes

### Issue: "Email not verified"
**Solution:** Complete email verification with OTP before accessing protected routes

---

## 📞 Support

For issues or questions:
- Check server logs for detailed error messages
- Review the API response `error` field for specific error details
- Ensure all required fields are provided in requests

---

## 🔄 Last Updated
November 1, 2025

---

**Happy Testing! 🚀**
