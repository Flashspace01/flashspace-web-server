# Booking Module API Documentation (QA Audit Edition)

All endpoints strictly require a valid JWT `Authorization: Bearer <token>` header unless otherwise noted. Responses follow a standardized wrapper:

```json
{
  "success": boolean,
  "message": string,
  "data": object | array,
  "error": any // Detailed in Dev, generic "Internal Server Error" in Prod
}
```

---

## 1. Get All Bookings for User

**Endpoint:** `GET /api/v1/bookings/`

**Description:** Fetches all active (non-deleted) bookings associated with the authenticated user with optional filtering and pagination. Returns remaining days calculated on-the-fly.

**Request Payload:**
_Query Parameters:_

- **Strictly Required:** None
- **Optional:**
  - `type` (string): Filters the booking by space type.
  - `status` (string): Filters the booking by its lifecycle status.
  - `page` (number): Pagination page. Default: `1`.
  - `limit` (number): Number of items per page. Default: `10`.

**Validation Rules:**

- `page` & `limit`: Must be valid stringified digits (`/^\d+$/`) which are then transformed to numbers. Negative values or non-integers are rejected.

**Responses:**

_200 OK (Success)_

```json
{
  "success": true,
  "bookings": [
    {
      "_id": "60d5ec...",
      "user": "60d5ea...",
      "spaceId": "60d5eb...",
      "type": "CoworkingSpace",
      "status": "active",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-12-31T23:59:59Z",
      "daysRemaining": 300
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pages": 1
  }
}
```

_400 Bad Request (Validation Error)_

```json
{
  "success": false,
  "message": "Validation Error",
  "data": {},
  "error": {
    "issues": [
      {
        "code": "invalid_string",
        "validation": "regex",
        "message": "Invalid",
        "path": ["query", "page"]
      }
    ]
  }
}
```

---

## 2. Get Bookings By Property

**Endpoint:** `GET /api/v1/bookings/property/:spaceId`

**Description:** Retrieves a user's bookings specifically for a given property/space. Can be optionally filtered to show bookings created within a specific month and year.

**Request Payload:**
_Path Parameters:_

- **Strictly Required:**
  - `spaceId` (string): The ObjectId of the space.

_Query Parameters:_

- **Optional:**
  - `year` (number): 4-digit year. Defaults to current year if only `month` is provided.
  - `month` (number): 1-12 representing the month.

**Validation Rules:**

- Note: This controller endpoint lacks explicit Zod validation for path parameters (unlike others in this module). It casts `spaceId` to an ObjectId internally, which will throw a 500 error instead of a clean 400 if an invalid ObjectId string is passed. **(QA BUG IDENTIFIED)**.

**Responses:**

_200 OK (Success)_

```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec...",
      "spaceId": "60d5eb...",
      "user": {
        "_id": "60d5ea...",
        "fullName": "Test User"
      }
    }
  ]
}
```

---

## 3. Get Booking by ID

**Endpoint:** `GET /api/v1/bookings/:bookingId`

**Description:** Retrieves the full details of a single booking belonging to the authenticated user, dynamically injecting `daysRemaining`.

**Request Payload:**
_Path Parameters:_

- **Strictly Required:**
  - `bookingId` (string): The ObjectId of the specific booking.

**Validation Rules:**

- Note: Similar to the property route, this lacks explicit Zod payload validation at the router level. Relies on Mongoose `findOne` silently failing to cast or returning null. **(QA BUG IDENTIFIED)**.

**Responses:**

_404 Not Found_

```json
{
  "success": false,
  "message": "Booking not found",
  "data": {},
  "error": "Internal Server Error"
}
```

---

## 4. Toggle Auto-Renew

**Endpoint:** `PATCH /api/v1/bookings/:bookingId/auto-renew`

**Description:** Toggles the `autoRenew` flag on a specific active booking.

**Request Payload:**
_Path Parameters:_

- **Strictly Required:** `bookingId` (string)

_Body Parameters:_

- **Strictly Required:**
  - `autoRenew` (boolean): `true` to enable, `false` to disable.

**Validation Rules:**

- `bookingId`: Must be a valid 24-character hex MongoDB ObjectId.
- `autoRenew`: Must be a strict boolean type. Strings `"true"`/`"false"` will fail Zod validation.

**Responses:**

_200 OK_

```json
{
  "success": true,
  "message": "Auto-renewal enabled"
}
```

---

## 5. Link Booking To KYC Profile

**Endpoint:** `POST /api/v1/bookings/:bookingId/link-profile`

**Description:** Associates an _approved_ KYC profile with a booking. This action activates the booking (`status: "active"`).

**Request Payload:**
_Path Parameters:_

- **Strictly Required:** `bookingId` (string)

_Body Parameters:_

- **Strictly Required:**
  - `profileId` (string): The ObjectId of the KYC Profile to link.

**Validation Rules:**

- Both `bookingId` and `profileId` must pass strict MongoDB ObjectId validation via Zod.
- **Business Logic:** The KYC Profile _must_ exist and have an `overallStatus` strictly equal to `"approved"`.
- **Business Logic:** Missing `startDate` / `endDate` are dynamically generated upon linking based on the `plan.tenure` (defaulting to 12 months).

**Responses:**

_404 Not Found (Business Logic Failure)_

```json
{
  "success": false,
  "message": "Profile must be approved before linking",
  "data": {},
  "error": "Internal Server Error"
}
```

---

## 6. Get Partner Dashboard Overview

**Endpoint:** `GET /api/v1/bookings/partner/overview`

**Description:** SECURED ROUTE (Requires `PARTNER` or `ADMIN` role). Fetches an aggregated high-level summary of all clients and bookings managed by the authenticated partner. Computes derived statuses like "EXPIRING_SOON" (if ≤ 7 days remain).

**Request Payload:**
_None_

**Validation Rules:**

- Strict Role-Based Access Control via `AuthMiddleware.requireRole`. User's JWT must contain a specific `role` claim.

**Responses:**

_200 OK (Success)_

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "BKG-12345",
        "companyName": "Tech Corp",
        "contactName": "John Doe",
        "plan": "Virtual Office Premium",
        "space": "Downtown Hub",
        "startDate": "2024-01-01",
        "endDate": "2024-12-31",
        "status": "ACTIVE",
        "kycStatus": "VERIFIED"
      }
    ]
  }
}
```

---

## 7. Get Partner Space Bookings

**Endpoint:** `GET /api/v1/bookings/partner/space/:spaceId`

**Description:** SECURED ROUTE (Requires `PARTNER` or `ADMIN` role). Fetches all detailed bookings for a specific space managed by the authenticated partner, supporting overlapping date intersections for the provided month/year.

**Request Payload:**
_Path Parameters:_

- **Strictly Required:** `spaceId` (string)

_Query Parameters:_

- **Optional:**
  - `month` (string)
  - `year` (string)

**Validation Rules:**

- `spaceId` must be a valid ObjectId.
- `month` / `year` must be digits only (`/^\d+$/`).
- **Business Logic:** The query performs a complex `$or` intersection to ensure any booking that _overlaps_ with the target month/year is returned, not just ones starting in that month.

---

### QA Audit Summary & Vulnerabilities Identified

1. **[RESOLVED] Missing Zod Validations (`GET /:bookingId` & `GET /property/:spaceId`)**:
   - **Fix Applied**: Added `getBookingByIdSchema` and `getBookingsByPropertySchema` strictly validating MongoDB ObjectId inputs. The controllers now gracefully intercept `validation.error` and return a clean 400 Bad Request instead of fatal 500 crashes.
2. **[RESOLVED] Missing Transaction wrap on Link KYC**:
   - **Fix Applied**: Local MongoDB environments run as `standalone` instances and reject strict ACID transaction numbers. Instead, rewrote `booking.service.ts -> linkBookingToProfile` using a Manual Compensation strategy. It caches the previous Booking layout before saving, tries to save the Profile, and if it fails, manually rolls back the Booking to the cached state. Same database integrity without the overhead.
3. **[RESOLVED] Pagination Limit Exploitation**:
   - **Fix Applied**: Safely bounded the `.limit` property in `getAllBookingsSchema` to a strict absolute maximum of `100` (`val <= 100`). Potential Memory Exhaustion DoS vector closed.
