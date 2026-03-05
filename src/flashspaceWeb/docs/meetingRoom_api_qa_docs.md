# Meeting Room API Documentation (QA Audit Edition)

All protected endpoints strictly require a valid JWT `Authorization: Bearer <token>` header belonging to a `PARTNER` or `ADMIN` role. Public GET routes are unsecured by design but rigorously typed.

---

## 1. Get All Meeting Rooms (Public)

**Endpoint:** `GET /api/v1/spaces/meeting-rooms/getAll`

**Description:** Retrieves a globally paginated array of approved and active Meeting Rooms across the platform.

**Request Payload:**
_Query Parameters (Optional):_

- `deleted` (string enum): `"true"` | `"false"`
- `type` (string enum): Space configurations.
- `minPrice` (number)
- `maxPrice` (number)
- `limit` (number): Paginates items. Default limits applied internally.

**Validation Rules:**

- `limit` is strictly bounded to a max of `100` via the `getMeetingRoomsSchema`. Malicious scraping attempts executing `?limit=10000000` will be intercepted and cleanly rejected via `400 Bad Request` prior to loading databases.

**Responses:**
_200 OK (Success)_

```json
{
  "success": true,
  "message": "Meeting rooms retrieved successfully",
  "data": [
    {
      "id": "60d5ec...",
      "name": "Executive Boardroom",
      "city": "Mumbai",
      "pricePerHour": 500,
      "capacity": 15
    }
  ]
}
```

---

## 2. Get Meeting Room By City (Public)

**Endpoint:** `GET /api/v1/spaces/meeting-rooms/getByCity/:city`

**Description:** Performs a strict regex matching query `^city$` on the specific City locale, returning localized Meeting Rooms.

**Request Payload:**
_Path Parameters:_

- `city` (string): Target city locale string. `min(2)` validation.

_Query Parameters:_

- Matches the `/getAll` standard queries, including clamped `limit` boundaries.

---

## 3. Get Meeting Room By ID (Public)

**Endpoint:** `GET /api/v1/spaces/meeting-rooms/getById/:meetingRoomId`

**Description:** Full telemetry fetch for an individual Meeting Room displaying imagery, coordinates, and operating hours.

**Request Payload:**
_Path Parameters:_

- `meetingRoomId` (string): The ObjectId of the specified Meeting Room.

**Validation Rules:**

- The parameter must formally match the `/^[0-9a-fA-F]{24}$/` RegExp. This stops catastrophic `CastError` DB crashes caused by injecting corrupted strings (`"hacker123"`).

---

## 4. Get Partner Meeting Rooms (Secured)

**Endpoint:** `GET /api/v1/spaces/meeting-rooms/partner/my-rooms`

**Description:** RBAC-enforced retrieval fetching only rooms explicitly `partner = user.id`. Subject to the same query bounding protocols as the generic lists.

---

### QA Audit Summary & Vulnerabilities Identified

1. **[RESOLVED] Unbounded Memory DoS (`/getAll`, `/getByCity`, `/partner/my-rooms`)**:
   - **Fix Applied**: Previously, these GET endpoints were not wired into any Zod schemas. This permitted an attacker to inject highly taxing generic queries to the MongoDB layer without a `limit` ceiling. I developed robust `Zod.query` models binding `limit: z.number().max(100)` to elegantly trap arbitrary scrape requests in the NodeJS layer before they cripple the database cluster.
2. **[RESOLVED] Formally Reverted `CastError` Crashes (`/:meetingRoomId`)**:
   - **Fix Applied**: Standard MongoDB queries crash outright if they are handed generic strings instead of 24-char Hex representations of ObjectIds. Previously, manipulating the URL `/getById/undefined` blew up the stack tracing routing. By supplying `z.string().regex(/^[0-9a-fA-F]{24}$/)`, we return formatted `400 Bad Requests` safely.
3. **[RESOLVED] Centralized Validation Pipeline**:
   - **Fix Applied**: `meetingRoom.controller.ts` now uses `validation.error` mapped issues to immediately respond with descriptive errors matching the rest of FlashSpace, maintaining REST parity.
