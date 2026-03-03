# Seating API Documentation (QA Audit Edition)

The Seating module handles all atomic operations relating to Coworking property desk holding, booking, checking availability, and canceling reservations. It utilizes strict Zod boundary protections to prevent malicious insertions or rapid data scraping.

---

## 1. Get Space Availability (Public)

**Endpoint:** `GET /api/v1/seating/availability/:spaceId?start={isoDate}&end={isoDate}`

**Description:** Returns the parsed layout of a CoworkingSpace mapped with boolean `available` markers calculating mathematical overlaps spanning pending and confirmed holds.

**Validation Rules:**

- `spaceId` utilizes strict regex binding: `/^[0-9a-fA-F]{24}$/`. This blocks malformed CastErrors.
- `start` and `end` times strictly enforce ISO DateTime casting mappings utilizing rigid string parsers.

---

## 2. Hold Seats (Protected)

**Endpoint:** `POST /api/v1/seating/hold`

**Description:** Assigns atomic `pending` state holds onto an array of `seatIds` enforcing a ten-minute countdown timer against collision overlays.

**Validation Rules:**

- Forces `.min(1)` bounds upon `seatIds` Array parsing, refusing blank arrays and instantly trapping undefined inputs.
- Parses ISO string injections cleanly, declining malformed strings natively at the Zod payload tier.

---

## 3. Confirm, Cancel & Retrieve Single Bookings (Protected)

**Endpoints:**

- `POST /api/v1/seating/confirm/:bookingId`
- `DELETE /api/v1/seating/:bookingId`
- `GET /api/v1/seating/:bookingId`

**Validation Rules:**

- Validates the `bookingId` using strictly generated RegExp constraints deflecting MongoDB CastErrors before the Mongoose Driver initiates execution sequences.
- Prevents missing `.paymentId` values inherently utilizing native `.min(1)` requirements strings on confirmations.

---

## 4. Retrieve User Bookings (Protected)

**Endpoint:** `GET /api/v1/seating/user?limit=10&page=1`

**Description:** Generates historic array mappings spanning seating transactions mapped uniquely onto the `user` property inside the token payload.

**Validation Rules (Sealed DoS Vulnerability):**

- **DoS Cap:** Paginates limits seamlessly truncating malicious strings through a constrained `.transform(Number)` mapped tightly behind an explicit mathematical minimum wrapper defined securely via `Math.min(limit, 100)`. Scrapers cannot enumerate millions of variables simultaneously; the REST Router responds rapidly possessing a clean 400 Bad Request exception block.
