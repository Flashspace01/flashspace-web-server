# Coworking Space Module API Documentation (QA Audit Edition)

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

## 1. Create Coworking Space

**Endpoint:** `POST /api/v1/coworkingSpace/create`

**Description:** (SECURED: `PARTNER` or `ADMIN` only). Creates a new coworking space and its underlying generic `Property` document. Generates seats automatically if floors/tables are provided without pre-defined seats.

**Request Payload:**
_Body Parameters:_

- **Strictly Required:**
  - `name` (string): Min 3 characters.
  - `address` (string): Min 5 characters.
  - `city` (string): Min 2 characters.
  - `area` (string): Min 2 characters.
  - `capacity` (number): Positive integer.
  - `images` (array of strings): At least 1 image URL.
- **Optional:**
  - `pricePerMonth` (number): Non-negative. _(See QA Warning below)_
  - `pricePerDay` (number): Non-negative. _(See QA Warning below)_
  - `floors` (array of objects): Defines hierarchy of Floor > Table > Seat.
  - `operatingHours` (object): `openTime` (HH:MM), `closeTime` (HH:MM), `daysOpen` (array).
  - `amenities` (array of strings).
  - `sponsored` (boolean).
  - `popular` (boolean).
  - `location` (object): GeoJSON Point.

**Validation Rules:**

- Floor logic: If `tables` are provided with `numberOfSeats` but an empty `seats` array, the service auto-generates seat IDs (e.g., `T1-1`).
- Strict Role-Based Access Control via `AuthMiddleware.requireRole(UserRole.PARTNER, UserRole.ADMIN)`.

**Responses:**

_201 Created (Success)_

```json
{
  "success": true,
  "message": "Coworking space created successfully",
  "data": {
    "id": "60d5ec...",
    "name": "Downtown Hub",
    "city": "Mumbai"
  }
}
```

_400 Bad Request (Validation Error)_

```json
{
  "success": false,
  "message": "Validation Error",
  "data": {},
  "error": [
    {
      "path": "body.capacity",
      "message": "Capacity must be a positive integer"
    }
  ]
}
```

---

## 2. Get All Coworking Spaces / Get By City

**Endpoints:**

- `GET /api/v1/coworkingSpace/getAll`
- `GET /api/v1/coworkingSpace/getByCity/:city`

**Description:** (PUBLIC). Fetches coworking spaces matching the criteria, flattening the `Property` populate into the root of the response for frontend consumption.

**Request Payload:**
_Path Parameters (for `getByCity`):_

- **Strictly Required:** `city` (string) - Performs a case-insensitive regex search.

_Query Parameters (for `getAll`):_

- **Optional:** `deleted` (string: "true") - Includes soft-deleted spaces if passed.

**Validation Rules:**

- The controller flattens the Mongoose output, moving all nested `property.*` (like `address`, `city`) up to the root level of each object.

**Responses:**

_200 OK (Success)_

```json
{
  "success": true,
  "message": "Coworking spaces retrieved successfully",
  "data": [
    {
      "id": "60d5ec...",
      "name": "Downtown Hub",
      "city": "Mumbai",
      "capacity": 100
    }
  ]
}
```

---

## 3. Get Coworking Space by ID

**Endpoint:** `GET /api/v1/coworkingSpace/getById/:coworkingSpaceId`

**Description:** (PUBLIC). Retrieves the full details of a specific coworking space by its MongoDB ObjectId.

**Request Payload:**
_Path Parameters:_

- **Strictly Required:** `coworkingSpaceId` (string).

**Validation Rules:**

- Controller explicitly validates `Types.ObjectId.isValid(spaceId)`, returning a clean 400 error if malformed instead of crashing Mongoose. **(Good Practice)**.

---

## 4. Update Coworking Space

**Endpoint:** `PUT /api/v1/coworkingSpace/update/:coworkingSpaceId`

**Description:** (SECURED). Updates an existing coworking space. The requester must be the `partner` who owns the space or an `ADMIN`. Prevents manual override of `avgRating` and `totalReviews`.

**Request Payload:**
_Path Parameters:_

- **Strictly Required:** `coworkingSpaceId` (string, 24-char hex format).

_Body Parameters:_

- **All Optional** (Same shape as Create).

**Validation Rules:**

- Path parameter strictly validated via Zod Regex `/^[0-9a-fA-F]{24}$/`.
- **Business Logic:** The Service layer extracts `avgRating` and `totalReviews` from the payload and drops them, making them mutation-resistant against malicious partners trying to artificially boost ratings.

---

## 5. Delete Coworking Space

**Endpoint:** `DELETE /api/v1/coworkingSpace/delete/:coworkingSpaceId`

**Description:** (SECURED). Performs a soft delete (`isActive: false, isDeleted: true`) on a coworking space. Requester must be the owning `partner` or an `ADMIN`.

**Request Payload:**
_Path Parameters:_

- **Strictly Required:** `coworkingSpaceId` (string).

---

## 6. Get Partner Spaces

**Endpoint:** `GET /api/v1/coworkingSpace/partner/spaces`

**Description:** (SECURED). Retrieves all coworking spaces belonging to the authenticated Partner user.

**Request Payload:**

- _None._ Uses JWT token subject ID.

---

### QA Audit Summary & Bugs

1. **[RESOLVED] Model/Payload Mismatch in Pricing:**
   - **Fix Applied:** The Zod `createCoworkingSpaceSchema` and frontend seamlessly send `pricePerMonth` and `pricePerDay`. The Coworking Space and Meeting Room controllers securely intercept these variables, mutate them to `partnerPricePerMonth` and `partnerPricePerHour`, and successfully save them into MongoDB. The APIs have been load-tested and integration-tested to verify the complete resolution of the crashing pipeline.
2. **[MODERATE] Property Query Override in Service (`getSpaces`):**
   - **Issue:** In `CoworkingSpaceService.getSpaces`, if the query contains `city`, `name`, or `area`, it fetches identical `propertyIds` and then assigns `query.property = { $in: propertyIds }`. If the caller _already_ passed a `property` filter to the query (e.g., trying to query a specific property ID AND a city), the logic forcefully overwrites the original `query.property` filter instead of using an `$and` intersection.
3. **[MODERATE] Lack of Transaction in Creation (`createSpace`):**
   - **Issue:** `PropertyService.createProperty()` inserts a generic `Property` document. Immediately after, `CoworkingSpaceModel.create()` tries to insert the child Coworking document. If the Coworking document fails to insert (like the pricing bug in point 1), the orphaned `Property` document is left permanently sitting in the database, bloating storage. This requires a MongoDB atomic Session transaction.
4. **[GOOD] Strong Validation Presence:**
   - **Praise:** Unlike the booking module, the `updateCoworkingSpace` route correctly intercepts bad ObjectIds at the Zod validation layer using the hex Regex matcher, preventing 500 errors. Rated highly against edge cases.
